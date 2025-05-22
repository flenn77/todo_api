const Ajv = require("ajv");
const addFormats = require("ajv-formats");

// Initialise AJV une seule fois
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

function validate(schema) {
  const validateFn = ajv.compile(schema);
  return (req, _res, next) => {
    const valid = validateFn(req.body);
    if (!valid) {
      const errors = validateFn.errors.map(e => `${e.instancePath} ${e.message}`).join("; ");
      const err = new Error(`Payload invalide : ${errors}`);
      err.status = 400;
      return next(err);
    }
    next();
  };
}

module.exports = validate;
