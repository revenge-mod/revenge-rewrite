import { sha512 } from '@noble/hashes/sha512'

import { readRevengeKey, readRevengeSignature } from '@revenge-mod/keyutil/v1'
import { FileModule } from '@revenge-mod/modules/native'
import { pluginsStates } from '@revenge-mod/preferences'
import {
    ExternalPluginManifestFilePath,
    ExternalPluginSourceFilePath,
    PluginDirectoryPath,
    PluginStoragePath,
} from '@revenge-mod/shared/paths'
import { awaitStorage } from '@revenge-mod/storage'
import { getErrorStack } from '@revenge-mod/utils/errors'
import { parseZip, parseZipFromURI } from '@revenge-mod/utils/zip'

import { parse as parseSchema } from 'valibot'

import {
    type ExternalPluginMetadata,
    type InternalPluginDefinition,
    externalPluginsMetadata,
    registerPlugin,
    registeredPlugins,
} from './internals'

import { logger } from './shared'

import { InstallPluginResult, type PluginInstallResult, PluginZipFileSizeLimit } from './constants'
import { type PluginManifest, type PluginDefinition, PluginManifestSchema } from './schemas'

import type { PluginContext, PluginStage } from './types'
export type * from './types'

export async function installPlugin(uri: string, trustUnsigned = false) {
    try {
        const local = !(uri.startsWith('http://') || uri.startsWith('https://'))
        const {
            'manifest.json': manifestJson,
            'source.zip': sourceZip,
            public_key: publicKey,
            'source.zip.sig': sourceZipSig,
        } = await parseZipFromURI(uri, { httpFileSizeLimit: PluginZipFileSizeLimit })

        if (!manifestJson || !sourceZip) return InstallPluginResult.InvalidFileFormat

        const sourceZipHash = sha512(sourceZip)

        try {
            const manifest = parseSchema(PluginManifestSchema, JSON.parse(new TextDecoder().decode(manifestJson)))
            if (manifest.id in registeredPlugins) return InstallPluginResult.AlreadyInstalled

            if (!sourceZipSig || !publicKey) {
                if (!trustUnsigned) return InstallPluginResult.PluginUnsigned
            } else {
                try {
                    const key = readRevengeKey(publicKey)
                    if (key.isPrivate()) return InstallPluginResult.InvalidKeyFileFormat
                    if (!key.isValid()) return InstallPluginResult.InvalidKeyFileFormat
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

export function clearPluginStorage(id: string) {
    return FileModule.removeFile('documents', PluginStoragePath(id))
}

export async function uninstallPlugin(id: string) {
    if (id in registeredPlugins) {
        const plugin = registeredPlugins[id]!
        if (!plugin.external) throw new Error(`Cannot uninstall internal plugin: ${plugin.id}`)

        plugin.disable()
        plugin.unregister()
        delete registeredPlugins[id]
    }

    if (!(id in externalPluginsMetadata)) throw new Error(`Plugin "${id}" is not installed`)

    delete externalPluginsMetadata[id]
    delete pluginsStates[id]

    await FileModule.clearFolder('documents', PluginDirectoryPath(id))

    return true
}

export const InstallPluginResultMessage: Record<PluginInstallResult, string> = {
    [InstallPluginResult.Success]: 'Plugin installed',
    [InstallPluginResult.InvalidFileFormat]: 'Invalid plugin file',
    [InstallPluginResult.InvalidManifest]: 'Invalid plugin manifest',
    [InstallPluginResult.AlreadyInstalled]: 'Plugin is already installed',
    [InstallPluginResult.InvalidSignatureFileFormat]: 'Invalid signature file',
    [InstallPluginResult.InvalidKeyFileFormat]: 'Invalid key file',
    [InstallPluginResult.KeyNoValidity]: 'Key has no validity. It may be expired or have been tampered.',
    [InstallPluginResult.KeyRevoked]: "Key has been revoked. This key may've been compromised.",
    [InstallPluginResult.SignatureVerificationFailed]:
        "Signature verification failed. The plugin may've been tampered.",
    [InstallPluginResult.PluginUnsigned]:
        'Unsigned plugin requires user confirmation. If you see this message, this is a bug.',
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
