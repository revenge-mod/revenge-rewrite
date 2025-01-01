import { type InferOutput, maxLength, minLength, object, pipe, regex, string } from 'valibot'

export const PluginManifestSchema = object({
    name: pipe(string(), minLength(1), maxLength(100)),
    description: pipe(string(), minLength(1), maxLength(500)),
    author: pipe(string(), minLength(1), maxLength(100)),
    id: pipe(string(), regex(/^[a-z0-9-_\.]{1,100}$/)),
    version: pipe(string(), minLength(1), maxLength(50)),
    icon: pipe(string(), minLength(1), maxLength(100)),
})

export type PluginManifest = InferOutput<typeof PluginManifestSchema>
