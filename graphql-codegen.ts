import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'https://api.opencollective.com/graphql/v2',
  documents: ['./worker/**/*.ts'],
  generates: {
    './worker/graphql-types.ts': {
      plugins: ['typescript', 'typescript-operations'],
    },
  },
}

export default config
