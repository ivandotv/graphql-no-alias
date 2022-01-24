import {
  ASTVisitor,
  ConstDirectiveNode,
  FieldNode,
  GraphQLError,
  GraphQLObjectType,
  ValidationContext
} from 'graphql'

//https://graphql.org/graphql-js/language/#visitor

export type ErrorFn = typeof createErrorMsg

/**
 * Configuration object for the createValidation function
 */
type Permissions = { [key: string]: Permissions | number }
export type Config = {
  permissions?: Permissions
  /** How many aliases (calls) to allow by default */
  defaultAllow?: number
  /** directive name to use*/
  directiveName?: string
  /** function that should return a graphql erorr or string when the validation fails*/
  errorFn?: ErrorFn
}
/**
 * Creates validation
 * @param config - {@link Config}
 * @returns validation function
 */
export default function createValidation(config?: Config): {
  typeDefs: string
  validation: (context: ValidationContext) => ASTVisitor
} {
  const { directiveName, defaultAllow, errorFn, permissions } = {
    ...{
      defaultAllow: 1,
      directiveName: 'noAlias',
      errorFn: createErrorMsg
    },
    ...(config || {})
  }

  return {
    typeDefs: `directive @${directiveName}(allow: Int = ${defaultAllow}) on OBJECT | FIELD_DEFINITION`,
    validation(context: ValidationContext): ASTVisitor {
      const ast: ASTVisitor = {
        Field: {
          leave: createFieldValidation(
            context,
            directiveName,
            defaultAllow,
            errorFn,
            permissions
          )
        }
      }

      return ast
    }
  }
}

function configPermissionWalker(
  permissions: Permissions,
  result: Map<string, number>,
  parentKey?: string
): void {
  Object.entries(permissions).forEach(([key, value]) => {
    if (typeof value === 'object') {
      configPermissionWalker(
        value,
        result,
        `${parentKey ? parentKey : ''}${parentKey && key ? '.' : ''}${
          key ? key : ''
        }`
      )
    } else {
      if (key === '*') {
        result.set(parentKey!, value)
      } else {
        result.set(`${parentKey ? parentKey : ''}.${key}`, value)
      }
    }
  })
}

function buildPermissionTableFromConfig(permissions: any): Map<string, number> {
  const result = new Map()
  configPermissionWalker(permissions, result, undefined)

  return result
}

function createFieldValidation(
  context: ValidationContext,
  directiveName: string,
  defaultAllow: number,
  errorFn: ErrorFn,
  permissions?: Permissions
): (node: FieldNode) => void {
  const schema = context.getSchema()

  let allowedCount: Map<string, number>

  if (permissions) {
    allowedCount = buildPermissionTableFromConfig(permissions)
  } else {
    allowedCount = buildPermissionTableFromSchema(defaultAllow, directiveName, [
      schema.getQueryType(),
      schema.getMutationType()
    ])
  }

  const currentCount: Map<string, number> = new Map()
  //track if the error have already been reported for particular field
  const errorMap: Map<string, boolean> = new Map()

  return (node: FieldNode) => {
    const parentTypeName = context.getParentType()?.name

    if (parentTypeName === 'Query' || parentTypeName === 'Mutation') {
      checkCount(context, node, allowedCount, currentCount, errorFn, errorMap)
    }
  }
}

/**
 * Checks if allowed alias count has been exceeded
 */
function checkCount(
  ctx: ValidationContext,
  node: FieldNode,
  maxAllowedData: Map<string, number>,
  currentCountData: Map<string, number>,
  errorFn: typeof createErrorMsg,
  errorMap: Map<string, boolean>
): void {
  const nodeName = node.name.value
  const typeName = ctx.getParentType()!.name
  const typeKey = `${typeName}`
  const fieldKey = `${typeKey}.${nodeName}`
  const maxAllowed = maxAllowedData.get(fieldKey) || maxAllowedData.get(typeKey)

  if (maxAllowed) {
    let currentCount = currentCountData.get(fieldKey) ?? 0
    currentCount++
    if (currentCount > maxAllowed) {
      // check if already reported for the current field
      if (!errorMap.get(fieldKey)) {
        const errorResult = errorFn(typeName, nodeName, maxAllowed, node, ctx)
        ctx.reportError(
          typeof errorResult === 'string'
            ? new GraphQLError(errorResult)
            : errorResult
        )
        errorMap.set(fieldKey, true)
      }

      return
    }

    currentCountData.set(fieldKey, currentCount)
  }
}

/**
 * Process appropriate schema types (Query, Mutation) and resolve all directive values by
 * building a mapping between type fields and allowed values
 */
function buildPermissionTableFromSchema(
  defaultAllow: number,
  directiveName: string,
  types: (GraphQLObjectType | undefined | null)[]
): Map<string, number> {
  const maxAllowed = new Map<string, number>()

  for (const graphType of types) {
    const value = graphType
      ? processDirective(
          directiveName,
          defaultAllow,
          // @ts-expect-error - directives array is typed as readonly
          graphType?.astNode?.directives
        )
      : undefined

    if (value) {
      maxAllowed.set(`${graphType!.name}`, value)
    }

    if (graphType?.astNode?.fields) {
      for (const field of Object.values(graphType.astNode.fields)) {
        const value = processDirective(
          directiveName,
          defaultAllow,
          // @ts-expect-error - directives array is typed as readonly
          field.directives
        )
        if (value) {
          maxAllowed.set(`${graphType}.${field.name.value}`, value)
        }
      }
    }
  }

  return maxAllowed
}

function processDirective(
  directiveName: string,
  defaultValue: number,
  directives?: ConstDirectiveNode[]
): number | undefined {
  return directives
    ?.filter((directive) => directive.name.value === directiveName)
    .map((dir) => {
      if (dir.arguments && dir.arguments[0]) {
        // @ts-expect-error - wrong types
        return parseInt(dir.arguments[0].value.value, 10)
      }

      return defaultValue
    })[0]
}

/**
 * Creates custom GraphQLError instance
 * @param typeName - Object type name
 * @param fieldName - Object field name
 * @param maxAllowed - max allowed count that has been reached
 */
function createErrorMsg(
  typeName: string,
  fieldName: string,
  maxAllowed: number,
  node: FieldNode,
  _ctx: ValidationContext
): GraphQLError | string {
  return new GraphQLError(
    `Allowed number of calls for ${typeName}->${fieldName} has been exceeded (max: ${maxAllowed})`,
    node
  )
}
