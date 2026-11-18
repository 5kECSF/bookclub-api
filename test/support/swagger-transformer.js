/**
 * ts-jest AST transformer that runs the @nestjs/swagger CLI plugin (as `nest build` does).
 * Without it the swagger PartialType/OmitType helpers don't know the DTO fields and
 * optional fields of mapped DTOs get validated as required.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const plugin = require('@nestjs/swagger/plugin');

module.exports = {
  name: 'nestjs-swagger-transformer',
  version: 1,
  factory: (tsCompiler, options) => plugin.before(options, tsCompiler.program),
};
