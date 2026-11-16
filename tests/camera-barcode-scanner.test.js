const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const scanner = require('../js/camera_barcode_scanner.js');
const ZXing = require('../js/vendor/zxing/zxing-library-0.21.3.min.js');

// --- Generador mínimo de EAN-13 para la prueba (módulos 0/1) ---
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

function ean13CheckDigit(twelve) {
  const sum = twelve.split('').reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return String((10 - (sum % 10)) % 10);
}

function ean13Modules(code) {
  const digits = code.split('').map(Number);
  const parity = PARITY[digits[0]];
  let bits = '101';
  for (let i = 1; i <= 6; i += 1) bits += (parity[i - 1] === 'L' ? L : G)[digits[i]];
  bits += '01010';
  for (let i = 7; i <= 12; i += 1) bits += L[digits[i]].split('').map((b) => (b === '1' ? '0' : '1')).join('');
  bits += '101';
  return bits;
}

function ean13Luminance(code, moduleWidth = 3, height = 60, quiet = 12) {
  const bits = '0'.repeat(quiet) + ean13Modules(code) + '0'.repeat(quiet);
  const width = bits.length * moduleWidth;
  const data = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      data[y * width + x] = bits[Math.floor(x / moduleWidth)] === '1' ? 0 : 255;
    }
  }
  return { data, width, height };
}

test('elige BarcodeDetector solo si existe y lee todos los formatos pedidos', () => {
  const all = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];
  assert.equal(scanner.chooseCameraBarcodeEngine(true, all), 'native');
  assert.equal(scanner.chooseCameraBarcodeEngine(true, ['ean_13', 'qr_code']), 'zxing');
  assert.equal(scanner.chooseCameraBarcodeEngine(true, []), 'zxing');
  assert.equal(scanner.chooseCameraBarcodeEngine(true, null), 'zxing');
  assert.equal(scanner.chooseCameraBarcodeEngine(false, all), 'zxing');
});

test('los formatos de ZXing y BarcodeDetector son los mismos siete', () => {
  assert.deepEqual(scanner.NATIVE_FORMATS, ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf']);
  assert.deepEqual(scanner.ZXING_FORMATS, ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39', 'ITF']);
  scanner.ZXING_FORMATS.forEach((f) => assert.notEqual(ZXing.BarcodeFormat[f], undefined, f));
});

test('normaliza el texto leído y rechaza vacío o demasiado largo', () => {
  assert.equal(scanner.normalizeCameraBarcodeText('  7801234567890\n'), '7801234567890');
  assert.equal(scanner.normalizeCameraBarcodeText('\u001dABC-123\u0000'), 'ABC-123');
  assert.equal(scanner.normalizeCameraBarcodeText(''), '');
  assert.equal(scanner.normalizeCameraBarcodeText(null), '');
  assert.equal(scanner.normalizeCameraBarcodeText('9'.repeat(65)), '');
});

test('clasifica los errores de la cámara con avisos claros', () => {
  assert.equal(scanner.classifyCameraError({ name: 'NotAllowedError' }).kind, 'denied');
  assert.equal(scanner.classifyCameraError({ name: 'SecurityError' }).kind, 'denied');
  assert.equal(scanner.classifyCameraError({ name: 'NotFoundError' }).kind, 'no-camera');
  assert.equal(scanner.classifyCameraError({ name: 'OverconstrainedError' }).kind, 'no-camera');
  assert.equal(scanner.classifyCameraError({ name: 'NotReadableError' }).kind, 'busy');
  assert.equal(scanner.classifyCameraError(new Error('x')).kind, 'other');
  assert.match(scanner.classifyCameraError({ name: 'NotFoundError' }).message, /No se encontró una cámara/);
});

test('detecta contexto inseguro (HTTP fuera de localhost)', () => {
  assert.equal(scanner.isCameraBlockedByInsecureContext({ isSecureContext: false }), true);
  assert.equal(scanner.isCameraBlockedByInsecureContext({ isSecureContext: true, protocol: 'http:' }), false);
  assert.equal(scanner.isCameraBlockedByInsecureContext({ protocol: 'http:', hostname: '192.168.1.20' }), true);
  assert.equal(scanner.isCameraBlockedByInsecureContext({ protocol: 'http:', hostname: 'localhost' }), false);
  assert.equal(scanner.isCameraBlockedByInsecureContext({ protocol: 'https:', hostname: 'minimarket.siacore.cl' }), false);
});

test('reconoce dispositivos móviles igual que antes', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
  assert.equal(scanner.isLikelyMobileDevice({ userAgent: iphone }), true);
  assert.equal(scanner.isLikelyMobileDevice({ userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120' }), false);
  assert.equal(scanner.isLikelyMobileDevice({ userAgent: 'Mozilla/5.0 (X11)', touchCapable: true, narrowScreen: true }), true);
});

test('la zona central recortada queda dentro del video y limitada en ancho', () => {
  const r = scanner.getCenterCropRect(1920, 1080, 800);
  assert.ok(r.sx >= 0 && r.sy >= 0 && r.sx + r.sw <= 1920 && r.sy + r.sh <= 1080);
  assert.equal(r.dw, 800);
  assert.equal(scanner.getCenterCropRect(0, 0), null);
  const small = scanner.getCenterCropRect(640, 480, 800);
  assert.equal(small.dw, small.sw);
});

test('ZXing local decodifica un EAN-13 generado', () => {
  const twelve = '780123456789';
  const code = twelve + ean13CheckDigit(twelve);
  const { data, width, height } = ean13Luminance(code);
  const reader = scanner.createZXingReader(ZXing);
  const source = new ZXing.RGBLuminanceSource(data, width, height);
  assert.equal(scanner.decodeLuminanceWithZXing(ZXing, reader, source), code);
});

test('ZXing devuelve vacío (sin lanzar) cuando la imagen no tiene código', () => {
  const width = 200;
  const height = 40;
  const data = new Uint8ClampedArray(width * height).fill(255);
  const reader = scanner.createZXingReader(ZXing);
  assert.equal(scanner.decodeLuminanceWithZXing(ZXing, reader, new ZXing.RGBLuminanceSource(data, width, height)), '');
});

test('hay una sola implementación del escáner de cámara en el frontend', () => {
  const scripts = fs.readFileSync(path.join(__dirname, '..', 'js', 'scripts.js'), 'utf8');
  assert.doesNotMatch(scripts, /new window\.BarcodeDetector|getUserMedia\(\{\s*video:[^}]*\}\s*,?\s*audio:[^}]*\}\);\s*video\.srcObject/);
  assert.doesNotMatch(scripts, /function isLikelyMobileDeviceForCameraPrompt/);
  const footer = fs.readFileSync(path.join(__dirname, '..', 'layout', 'footer.php'), 'utf8');
  assert.ok(footer.indexOf('camera_barcode_scanner.js') > -1 && footer.indexOf('camera_barcode_scanner.js') < footer.indexOf('scripts.js'));
});
