import { getErrorStack } from '@revenge-mod/utils/errors'

import {
    type ExternalPluginMetadata,
    type InternalPluginDefinition,
    externalPluginsMetadata,
    registerPlugin,
    registeredPlugins,
} from './internals'

import { logger } from './shared'

import { Platform } from 'react-native'
import { type UZIPFiles, parse as parseZip } from 'uzip'

import { sha512 } from '@noble/hashes/sha512'
import { readRevengeKey, readRevengeSignature } from '@revenge-mod/keyutil/v1'
import { FileModule } from '@revenge-mod/modules/native'
import { ExternalPluginManifestFilePath, ExternalPluginSourceFilePath } from '@revenge-mod/shared/paths'
import { awaitStorage } from '@revenge-mod/storage'
import { parse as parseSchema } from 'valibot'
import { InstallPluginResult, type PluginInstallResult, PluginZipFileSizeLimit } from './constants'
import { type PluginManifest, PluginManifestSchema } from './schemas'
import type { PluginContext, PluginDefinition, PluginStage } from './types'

export type * from './types'

async function parseZipFromUri(uri: string): Promise<[local: boolean, zip: UZIPFiles]> {
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
        const headRes = await fetch(uri, {
            method: 'HEAD',
        })

        const cl = headRes.headers.get('content-length')
        if (!cl) throw new Error('Server did not provide "Content-Length" header')
        if (Number(cl) > PluginZipFileSizeLimit)
            throw new Error(`File size exceeds the limit of ${PluginZipFileSizeLimit} bytes`)

        const res = await fetch(uri)
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`)

        const buf = new Uint8Array(await res.arrayBuffer())
        return [false, parseZip(buf)] as const
    }

    if (Platform.OS === 'android' && uri.startsWith('content://')) {
        const fs = ReactNative.NativeModules.RNFSManager

        // https://github.com/itinance/react-native-fs/issues/1074#issuecomment-1049915910
        // const { size } = await fs.stat(uri)
        // if (size > PluginZipFileSizeLimit)
        //     throw new Error(`File size exceeds the limit of ${PluginZipFileSizeLimit} bytes`)

        const b64 = await fs.readFile(uri)
        return [true, parseZip(Buffer.from(b64, 'base64'))]
    }

    if (Platform.OS === 'ios' && uri.startsWith('file://')) {
        // TODO: File size check
        const buf = await fetch(uri).then(res => res.arrayBuffer())
        return [true, parseZip(buf)]
    }

    throw new Error(`Unsupported URI: ${uri}`)
}

export async function installPlugin(uri: string, trustUnsigned = false) {
    try {
        const [
            local,
            {
                'manifest.json': manifestJson,
                'source.zip': sourceZip,
                public_key: publicKey,
                'source.zip.sig': sourceZipSig,
            },
        ] = await parseZipFromUri(uri)

        if (!manifestJson || !sourceZip) return InstallPluginResult.InvalidFileFormat

        const sourceZipHash = sha512(sourceZip)

        try {
            const manifest = parseSchema(PluginManifestSchema, JSON.parse(new TextDecoder().decode(manifestJson)))
            if (manifest.id in registeredPlugins) return InstallPluginResult.AlreadyInstalled

            if (!sourceZipSig || !publicKey) {
                if (!trustUnsigned) return InstallPluginResult.UnsignedUserConfirmationNeeded
            } else {
                try {
                    const key = readRevengeKey(publicKey.buffer)
                    if (key.isPrivate()) return InstallPluginResult.InvalidKeyFileFormat
                    if (!key.verify(readRevengeSignature(sourceZipSig).signature, sourceZipHash))
                        return InstallPluginResult.SignatureVerificationFailed
                } catch (e) {
                    return InstallPluginResult.InvalidKeyFileFormat
                }
            }

            await FileModule.writeFile(
                'documents',
                ExternalPluginManifestFilePath(manifest.id),
                JSON.stringify(manifest),
                'utf8',
            )

            await FileModule.writeFile(
                'documents',
                ExternalPluginSourceFilePath(manifest.id),
                Buffer.from(sourceZip).toString('base64'),
                'base64',
            )

            externalPluginsMetadata[manifest.id] = { local, source: local ? undefined : uri } as ExternalPluginMetadata

            // Register the plugin after it's installed
            registerExternalPlugin(manifest.id)

            return InstallPluginResult.Success
        } catch (e) {
            return InstallPluginResult.InvalidManifest
        }
    } catch (e) {
        return InstallPluginResult.InvalidFileFormat
    }
}

export const InstallPluginResultMessage: Record<PluginInstallResult, string> = {
    [InstallPluginResult.Success]: 'Successfully installed plugin',
    [InstallPluginResult.InvalidFileFormat]: 'Invalid plugin file format',
    [InstallPluginResult.InvalidManifest]: 'Invalid plugin manifest',
    [InstallPluginResult.AlreadyInstalled]: 'Plugin is already installed',
    [InstallPluginResult.InvalidSignatureFileFormat]: 'Invalid signature file format',
    [InstallPluginResult.InvalidKeyFileFormat]: 'Invalid key file format',
    [InstallPluginResult.SignatureVerificationFailed]: 'Signature verification failed',
    [InstallPluginResult.UnsignedUserConfirmationNeeded]: 'Unsigned plugin requires user confirmation',
}

/**
 * Starts the lifecycles of all plugins. **Errors are only thrown for unqueued lifecycles like `beforeAppRender`.**
 * @internal
 */
export function startPlugins() {
    logger.info('Starting plugins...')

    const promises: Promise<unknown>[] = []
    const errors: AggregateError[] = []

    for (const plugin of Object.values(registeredPlugins)) {
        if (!plugin.enabled) continue
        promises.push(plugin.start!().catch(e => errors.push(e)))
    }

    return new Promise<void>((resolve, reject) => {
        Promise.all(promises)
            .then(() =>
                errors.length
                    ? reject(
                          new AggregateError(
                              errors,
                              `Encountered ${errors.length} errors while starting plugins:\n${errors.map(getErrorStack).join('\n')}`,
                          ),
                      )
                    : resolve(),
            )
            .catch(reject)
    })
}

const DDP = FileModule.getConstants().DocumentsDirPath
export async function registerExternalPlugin(id: PluginManifest['id']) {
    const manifestJson = await FileModule.readFile(`${DDP}/${ExternalPluginManifestFilePath(id)}`, 'utf8')
    const pluginZipB64 = await FileModule.readFile(`${DDP}/${ExternalPluginSourceFilePath(id)}`, 'base64')
    if (!manifestJson || !pluginZipB64) return false

    const manifest = parseSchema(PluginManifestSchema, JSON.parse(manifestJson))
    // TODO: native plugins :O
    const { 'plugin.js': pluginJs } = parseZip(Buffer.from(pluginZipB64, 'base64'))

    try {
        type AnyPluginDefinition = PluginDefinition<any, any, any>
        type DefinePluginFunction = (def: AnyPluginDefinition) => AnyPluginDefinition
        type DefinePluginCallback = (definePlugin: DefinePluginFunction) => AnyPluginDefinition

        // TODO: Add some validation here, god damn it
        const definePlugin: DefinePluginFunction = def => def

        const definePluginCallback: DefinePluginCallback = globalEvalWithSourceUrl(
            `((definePlugin)=>{return ${new TextDecoder().decode(pluginJs)}})`,
            `revenge.plugins.definePlugin(${manifest.id})`,
        )

        registerPlugin(manifest, definePluginCallback(definePlugin))
        logger.log(`Registered external plugin: ${manifest.id}`)

        return true
    } catch {
        logger.error(`Failed to register external plugin: ${manifest.id}`)
        return false
    }
}

export async function registerExternalPlugins() {
    await awaitStorage(externalPluginsMetadata)
    await Promise.all(Object.keys(externalPluginsMetadata).map(registerExternalPlugin))
}

export type PluginContextFor<Definition, Stage extends PluginStage> = Definition extends InternalPluginDefinition<
    infer Storage,
    infer AppLaunchedReturn,
    infer AppInitializedReturn
>
    ? PluginContext<Stage, Storage, AppLaunchedReturn, AppInitializedReturn>
    : never
