import { registerCustomAsset } from '@revenge-mod/assets'
import { registerPlugin } from '@revenge-mod/plugins/internals'

import HermesIcon from '../../assets/hermes.webp'
import PluginIcon from '../../assets/plugin.webp'
import ReactIcon from '../../assets/react.webp'
import RevengeIcon from '../../assets/revenge.webp'

registerPlugin(
    {
        name: 'Assets',
        author: 'Revenge',
        description: "Registers Revenge's assets as React Native assets",
        id: 'revenge.assets',
        version: '1.0.0',
        icon: 'ImageIcon',
    },
    {
        beforeAppRender() {
            registerCustomAsset(
                {
                    name: 'Revenge.RevengeIcon',
                    type: 'webp',
                },
                RevengeIcon,
            )

            registerCustomAsset(
                {
                    name: 'Revenge.HermesIcon',
                    type: 'webp',
                },
                HermesIcon,
            )

            registerCustomAsset(
                {
                    name: 'Revenge.ReactIcon',
                    type: 'webp',
                },
                ReactIcon,
            )

            registerCustomAsset(
                {
                    name: 'Revenge.PluginIcon',
                    type: 'webp',
                },
                PluginIcon,
            )
        },
    },
    {
        core: true,
    },
)
