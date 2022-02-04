# Envelop Plugin

This package is an [envelop plugin](https://www.envelop.dev) version of
[`graphql-no-alias`](https://github.com/ivandotv/graphql-no-alias) validation directive.

## Install

```sh
npm Install envelop-no-alias
```

## Usage

```ts
import { envelop } from '@envelop/core'
import { useNoAlias, Config } from 'envelop-no-alias'

//optional configuration
const config: Config = {}
const getEnveloped = envelop({
  plugins: [useNoAlias(config)]
})
```

Or if you are using type definitions:

```ts
import { envelop } from '@envelop/core'
import { useNoAlias, createTypeDefinition } from 'envelop-no-alias'

//add type defintion to schema
const schema = buildSchema(`
  ${createTypeDefinition()}
  type Query {
    hello: String @noAlias(allow:2)
  }

  type Mutation @noAlias {
    muteOne(n:Int):String
  }
`)

const getEnveloped = envelop({
  plugins: [useNoAlias()]
})
```
