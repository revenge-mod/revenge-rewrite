import { resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'
import { transformFile } from '@swc/core'
import chalk from 'chalk'
import { build } from 'esbuild'
import pluginGlobals from 'esbuild-plugin-globals'
import yargs from 'yargs-parser'
import shimmedDeps from '../shims/deps'

const args = yargs(process.argv.slice(2))
const { release, minify, dev } = args

const context = {
    hash: 'local',
    hashDirty: !!(await Bun.$`git diff --quiet && git diff --cached --quiet`
        .quiet()
        .nothrow()
        .then(res => res.exitCode)),
}

/**
 * @type {import('esbuild').BuildOptions}
 */
const config = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    outfile: 'dist/revenge.js',
    format: 'iife',
    splitting: false,
    external: ['react', 'react-native', 'react/jsx-runtime'],
    supported: {
        // Hermes does not actually support const and let, even though it syntactically
        // accepts it, but it's treated just like 'var' and causes issues
        'const-and-let': false,
    },
    define: {
        __REVENGE_DEV__: `${dev}`,
        __REVENGE_RELEASE__: `"${release ?? 'local'}"`,
        __REVENGE_HASH__: `"${context.hash}"`,
        __REVENGE_HASH_DIRTY__: `${context.hashDirty}`,
    },
    footer: {
        js: '//# sourceURL=revenge',
    },
    loader: {
        '.webp': 'dataurl',
    },
    legalComments: 'none',
    alias: {
        '!deps-shim!': './shims/deps.ts',
        'react/jsx-runtime': './shims/react~jsx-runtime.ts',
        events: './shims/events.ts',
    },
    plugins: [
        pluginGlobals({
            ...Object.keys(shimmedDeps).reduce(
                (deps, name) => {
                    deps[name] = `require('!deps-shim!').default[${JSON.stringify(name)}]()`
                    return deps
                },
                {},
            ),
        }),
        {
            name: 'swc',
            setup(build) {
                build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async args => {
                    const result = await transformFile(args.path, {
                        jsc: {
                            externalHelpers: true,
                            transform: {
                                react: {
                                    runtime: 'automatic',
                                },
                            },
                        },
                        // https://github.com/facebook/hermes/blob/3815fec63d1a6667ca3195160d6e12fee6a0d8d5/doc/Features.md
                        // https://github.com/facebook/hermes/issues/696#issuecomment-1396235791
                        env: {
                            targets: 'fully supports es6',
                            include: [
                                'transform-block-scoping',
                                'transform-classes',
                                'transform-async-to-generator',
                                'transform-async-generator-functions',
                                'transform-named-capturing-groups-regex',
                            ],
                            exclude: [
                                'transform-parameters',
                                'transform-template-literals',
                                'transform-exponentiation-operator',
                                'transform-nullish-coalescing-operator',
                                'transform-object-rest-spread',
                                'transform-optional-chaining',
                                'transform-logical-assignment-operators',
                            ],
                        },
                    })

                    return { contents: result.code }
                })
            },
        },
    ],
}

export async function buildBundle(overrideConfig = {}) {
    context.hash = await Bun.$`git rev-parse --short HEAD`
        .nothrow()
        .quiet()
        .text()
        .then(res => res.trim())
    config.define.__REVENGE_HASH__ = `"${context.hash}"`

    const initialStartTime = performance.now()
    await build({ ...config, ...overrideConfig })

    return {
        config,
        context,
        timeTook: performance.now() - initialStartTime,
    }
}

const pathToThisFile = resolvePath(fileURLToPath(import.meta.url))
const pathPassedToNode = resolvePath(process.argv[1])
const isThisFileBeingRunViaCLI = pathToThisFile.includes(pathPassedToNode)

if (isThisFileBeingRunViaCLI) {
    const { timeTook } = await buildBundle()

    printBuildSuccess(context.hash, release, timeTook)

    if (minify) {
        const { timeTook } = await buildBundle({
            minifyWhitespace: true,
            minifySyntax: true,
            outfile: config.outfile.replace(/\.js$/, '.min.js'),
        })

        printBuildSuccess(context.hash, release, timeTook, true)
    }
}

export function printBuildSuccess(hash, release, timeTook, minified = false) {
    console.info(
        [
            chalk.bold.greenBright(`✔ Built bundle${minified ? ' (minified)' : ''}`),
            hash && chalk.bold.blueBright(`(${hash})`),
            !release && chalk.bold.cyanBright('(local)'),
            timeTook && chalk.gray(`in ${timeTook.toFixed(3)}ms`),
        ]
            .filter(Boolean)
            .join(' '),
    )
}
