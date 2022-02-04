import { assertSingleExecutionValue, createTestkit } from '@envelop/testing'
import { buildSchema } from 'graphql'
import { useNoAlias, createTypeDefinition } from '../'

describe('No Alias plugin', () => {
  test('If the directive is not used, it does not fail', async () => {
    const typeDefs = createTypeDefinition()
    const schema = buildSchema(/* GraphQL */ `
      ${typeDefs}

      type Query {
        getUser: User
      }
      type User {
        name: String
      }
    `)

    const query = /* GraphQL */ `
      {
        getUser {
          name
        }
        alias_1: getUser {
          name
        }
      }
    `
    const testkit = createTestkit([useNoAlias()], schema)
    const result = await testkit.execute(query)
    assertSingleExecutionValue(result)
    expect(result.data).toBeDefined()
  })

  test('Do not allow double query', async () => {
    const typeDefs = createTypeDefinition()
    const defaultAllow = 1
    const schema = buildSchema(/* GraphQL */ `
      ${typeDefs}

      type Query {
        getUser: User @noAlias
      }
      type User {
        name: String
      }
    `)

    const query = /* GraphQL */ `
      {
        getUser {
          name
        }
        alias_1: getUser {
          name
        }
      }
    `
    const testkit = createTestkit([useNoAlias()], schema)
    const result = await testkit.execute(query)
    assertSingleExecutionValue(result)
    expect(result.data).toBeUndefined()

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toMatch(
      new RegExp(`Allowed number of calls.+${defaultAllow}`, 'i')
    )
  })

  test('Correctly pass in configuration object', async () => {
    const defaultAllow = 1
    const permissions = {
      Query: {
        '*': defaultAllow
      }
    }
    const schema = buildSchema(/* GraphQL */ `
      type Query {
        getUser: User
        getAnotherUser: User
      }
      type User {
        name: String
      }
    `)

    const query = /* GraphQL */ `
      {
        getUser {
          name
        }
        alias_1: getUser {
          name
        }
        getAnotherUser {
          name
        }
        alias_2: getAnotherUser {
          name
        }
      }
    `

    const testkit = createTestkit([useNoAlias({ permissions })], schema)
    const result = await testkit.execute(query)
    assertSingleExecutionValue(result)
    expect(result.data).toBeUndefined()

    expect(result.errors).toHaveLength(2)
    expect(result.errors[0].message).toMatch(
      new RegExp(`Allowed number of calls.+${defaultAllow}`, 'i')
    )
  })
})
