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
        {
            name: 'Nexpid',
            url: 'https://github.com/nexpid',
            icon: 'https://github.com/nexpid.png',
            roles: ['Developer'],
        },
    ],
    contributors: [
        {
            name: 'Marsh',
            icon: 'https://github.com/marshift.png',
            url: 'https://marsh.zone',
            roles: ['Collaborator'],
        },
        {
            name: 'Cristian',
            icon: 'https://github.com/Cristiandis.png',
            url: 'https://github.com/Cristiandis',
            roles: ['Contributor', 'Early iOS Tester'],
        },
        {
            name: 'Bread Cat',
            icon: 'https://github.com/breadcat0314.png',
            roles: ['Early iOS Tester'],
            url: 'https://github.com/breadcat0314',
        },
        {
            name: 'Puhbu',
            icon: 'https://github.com/puhbu.png',
            roles: ['Early Android Tester'],
        },
        {
            name: 'true1ann',
            url: 'https://github.com/true1ann',
            icon: 'https://github.com/true1ann.png',
            roles: ['CI Contributor']
        }
    ],
} as Record<'team' | 'contributors', Array<{ name: string; icon?: string; url?: string; roles: string[] }>>
