import { unzipSync } from 'fflate/browser'
import { Platform } from 'react-native'

export function parseZip(buf: ArrayBuffer | Uint8Array) {
    return unzipSync(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
}

export interface ParseZipFromURIOptions {
    /**
     * Maximum allowed size of the file in bytes.
     * Checked using the Content-Length header, if none is provided, an error is thrown.
     */
    httpFileSizeLimit?: number
}

export async function parseZipFromURI(uri: string, options?: ParseZipFromURIOptions) {
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
        try {
            const res = await fetch(uri)
            if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`)
            if (options?.httpFileSizeLimit) {
                const cl = res.headers.get('content-length')
                if (!cl) throw new Error('Server did not provide "Content-Length" header')
                if (Number(cl) > options.httpFileSizeLimit) throw new Error('File size exceeds the limit')
            }

            const buf = new Uint8Array(await res.arrayBuffer())
            return unzipSync(buf)
        } catch (e) {
            throw new Error(`Failed to fetch: ${e}`, { cause: e })
        }
    }

    try {
        if (Platform.OS === 'android' && uri.startsWith('content://')) {
            const fs = ReactNative.NativeModules.RNFSManager

            const b64 = await fs.readFile(uri)
            return unzipSync(Buffer.from(b64, 'base64'))
        }

        if (Platform.OS === 'ios' && uri.startsWith('file://')) {
            const buf = await fetch(uri).then(res => res.arrayBuffer())
            return unzipSync(new Uint8Array(buf))
        }
    } catch (e) {
        throw new Error(`Failed to read file: ${e}`, { cause: e })
    }

    throw new Error(`Unsupported URI: ${uri}`)
}
