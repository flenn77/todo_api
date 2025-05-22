module.exports = {
    create: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1 }
      },
      required: ["title"],
      additionalProperties: false
    },
    updateDone: {
      type: "object",
      properties: {
        done: { type: "boolean" }
      },
      required: ["done"],
      additionalProperties: false
    }
  };
  