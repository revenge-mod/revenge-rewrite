export default {
    team: [
        {
            name: 'Palm',
            url: 'https://palmdevs.me',
            icon: 'https://github.com/PalmDevs.png',
            roles: ['Founder', 'Lead Developer'],
        },
        {
            name: 'oSumAtrIX',
            url: 'https://osumatrix.me',
            icon: 'https://github.com/oSumAtrIX.png',
            roles: ['Project Manager', 'Android Development'],
        },
    ],
    contributors: [
        {
            name: 'Marsh',
            icon: 'https://github.com/marshift.png',
            url: 'https://marsh.zone',
            roles: ['Collaborator']
        },
        {
            name: 'Cristian',
            icon: 'https://github.com/Cristiandis.png',
            url: 'https://github.com/Cristiandis',
            roles: ['Contributor', 'Early iOS Tester']
        },
        {
            name: 'Bread Cat',
            roles: ['Early iOS Tester']
        },
        {
            name: 'Puhbu',
            icon: 'https://github.com/puhbu.png',
            roles: ['Early Android Tester']
        }
    ],
} as Record<'team' | 'contributors', Array<{ name: string; icon?: string; url?: string; roles: string[] }>>
