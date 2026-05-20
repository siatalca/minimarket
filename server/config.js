const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

try {
  require('dotenv').config({
    path: path.join(__dirname, '.env'),
    override: true,
  });
} catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND') {
    throw err;
  }
}

const env = process.env;
const isProd = env.NODE_ENV === 'production';

function getPersistentLocalJwtSecret() {
  const secretFilePath = path.join(__dirname, '.jwt_secret');
  try {
    if (fs.existsSync(secretFilePath)) {
      const existing = String(fs.readFileSync(secretFilePath, 'utf8') || '').trim();
      if (existing.length >= 32) {
        return existing;
      }
    }
  } catch (_) {
    // ignore and try to recreate
  }

  const generated = crypto.randomBytes(48).toString('hex');
  try {
    fs.writeFileSync(secretFilePath, generated, { encoding: 'utf8', mode: 0o600 });
  } catch (_) {
    // if writing fails, still return generated secret for current run
  }
  return generated;
}

const effectiveJwtSecret = env.JWT_SECRET || getPersistentLocalJwtSecret();

const config = {
  env: env.NODE_ENV || 'development',
  apiHost: env.API_HOST || '0.0.0.0',
  apiPort: Number.parseInt(env.PORT, 10) || 3002,
  db: {
    host: env.DB_HOST || 'localhost',
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'minimarket',
    port: Number.parseInt(env.DB_PORT, 10) || 3306,
    connectionLimit: Number.parseInt(env.DB_POOL_LIMIT, 10) || 10,
  },
  corsOrigin: env.CORS_ORIGIN || '*',
  jwtSecret: effectiveJwtSecret,
  jwtExpiresIn: env.JWT_EXPIRES_IN || '24h',
  refreshTokenExpiresIn: env.JWT_REFRESH_EXPIRES_IN || '16h',
  smtp: {
    host: env.SMTP_HOST || '',
    port: Number.parseInt(env.SMTP_PORT, 10) || 587,
    secure: env.SMTP_SECURE === '1' || env.SMTP_SECURE === 'true',
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.SMTP_FROM || '',
  },
  dte: {
    certSecret: env.DTE_CERT_SECRET || `${env.JWT_SECRET || 'minimarket_local'}_dte_cert_secret`,
  },
};

if (!env.JWT_SECRET) {
  const warning = 'JWT_SECRET no esta configurado; se usara un secreto local persistente (archivo server/.jwt_secret).';
  if (isProd) {
    throw new Error('JWT_SECRET es obligatorio en produccion.');
  }
  console.log(`${warning} Para entorno local es aceptable.`);
}

if (isProd && config.corsOrigin === '*') {
  console.warn('CORS_ORIGIN esta en "*". Configure dominios permitidos para produccion.');
}

module.exports = { config, isProd };
