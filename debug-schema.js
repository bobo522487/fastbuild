import { SchemaCompiler } from '@workspace/schema-compiler';

const testMetadata = {
  version: '1.0.0',
  fields: [
    {
      id: 'name',
      name: 'name',
      type: 'text',
      label: '姓名',
      required: true,
    },
  ],
};

const compiler = new SchemaCompiler();
const result = compiler.compile(testMetadata);

console.log('Result:', JSON.stringify(result, null, 2));
console.log('Success:', result.success);
console.log('Errors:', result.errors);

if (result.errors && result.errors.length > 0) {
  console.log('Error details:');
  result.errors.forEach((error, index) => {
    console.log(`Error ${index + 1}:`, error);
  });
}