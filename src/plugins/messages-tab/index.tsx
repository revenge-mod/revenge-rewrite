import { registerPlugin } from '@revenge-mod/plugins/internals'
import { lazyValue } from '@revenge-mod/utils/lazy'
import type { FC, ReactElement, ReactNode } from 'react'

type BasicNavigationObject = {
    navigate(screen: string): void
}

registerPlugin(
    {
        name: 'Messages Tab',
        author: 'Palm',
        description: 'Brings the messages tab back',
        id: 'palmdevs.messages-tab',
        version: '1.0.0',
        icon: 'ic_message',
        beforeAppRender({ patcher, revenge: { modules } }) {
            const Messages = modules.findByFilePath<{ type: FC }, true>(
                'modules/main_tabs_v2/native/tabs/messages/Messages.tsx',
            )!

            const useTabBarTabOptions = modules.findByName<
                () => { messages: (opts: { navigation: BasicNavigationObject }) => unknown },
                true
            >('useTabBarTabOptions')!

            const NavigationBottomTabs = modules.findByProps<{
                createBottomTabNavigator: () => {
                    Navigator: FC<{
                        tabBar: (props: { navigation: BasicNavigationObject }) => ReactNode
                        children: ReactElement<{ children: Array<ReactElement<{ name: string }> | undefined> }>
                    }>
                    Screen: FC<{
                        options: unknown
                        name: string
                        component: FC
                    }>
                }
            }>('createBottomTabNavigator')!

            patcher.after(NavigationBottomTabs!, 'createBottomTabNavigator', (_, Tab) => {
                patcher.before(Tab, 'Navigator', ([props]) => {
                    let navigation: BasicNavigationObject

                    const screens = props.children.props.children

                    const origTabBar = props.tabBar
                    props.tabBar = tbProps => {
                        navigation = tbProps.navigation
                        return origTabBar(tbProps)
                    }

                    const tabBarTabOptions = useTabBarTabOptions()

                    if (!screens.some(screen => screen?.props?.name === 'messages'))
                        screens.splice(
                            1,
                            0,
                            <Tab.Screen
                                options={tabBarTabOptions.messages({ navigation: lazyValue(() => navigation) })}
                                name="messages"
                                component={() => Messages.type({})}
                            />,
                        )
                })
            })

            patcher.instead(
                modules.findByProps<{
                    transitionTo: (path: string, opts: { navigationReplace: boolean; openChannel: boolean }) => void
                }>('transitionTo')!,
                'transitionTo',
                (args, orig) => {
                    if (args[0].startsWith('/channels/@me')) {
                        orig(args[0], { navigationReplace: false, openChannel: true })
                    } else orig(...args)
                },
            )

            patcher.instead(modules.findProp<{ type: FC }>('Messages', 'DragPreview')!, 'type', () => null)
        },
    },
    true,
)
