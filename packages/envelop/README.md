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
import { useNoAlias, NoAliasConfig } from 'envelop-no-alias'

//optional configuration
const config: NoAliasConfig = {}
const getEnveloped = envelop({
  plugins: [useNoAlias(config)]
})
```
