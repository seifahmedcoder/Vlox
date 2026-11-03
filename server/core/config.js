import "dotenv/config";
import validator from "validator";
import sharedConfig from "../../shared/config.js";

const { MONGO_URI, SESSION_SECRET, PORT = "3000", PRODUCTION } = process.env;

if (!validator.isPort(PORT)) throw new Error(`Config Error: "${PORT}" is not a valid network port number.`);
if (!MONGO_URI || !SESSION_SECRET) throw new Error("Config Error: MONGO_URI and SESSION_SECRET must be set in .env file.");

const config = {
    ...sharedConfig,

    // Server and session
    MAX_SESSION_AGE: 3600000,
    JSON_BODY_LIMIT: "10mb",
    HOST: "0.0.0.0",

    // Rate limiting
    RATE_LIMIT_WINDOW_MS: 900000,
    MAIN_RATE_LIMIT_MAX_REQ: 1000,
    AUTH_RATE_LIMIT_MAX_REQ: 10,

    // Password and recovery code security
    RECOVERY_CODE_COUNT: 3,
    RECOVERY_CODE_RANDOM_BYTES: 10,
    BCRYPT_SALT_ROUNDS: 10,

    // Env values
    MONGO_URI: MONGO_URI,
    SESSION_SECRET: SESSION_SECRET,
    PORT: parseInt(PORT),
    PRODUCTION:  PRODUCTION === "production"
};

export default config;