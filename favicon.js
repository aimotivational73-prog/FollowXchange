(function() {
    const iconUrl = '/FollowXchange.webp';
    const themeColor = '#E1306C';

    const tags = [

        { tag: 'link', rel: 'icon', type: 'image/webp', sizes: '32x32', href: iconUrl },
        { tag: 'link', rel: 'icon', type: 'image/webp', sizes: '192x192', href: iconUrl },
        
        { tag: 'link', rel: 'apple-touch-icon', sizes: '180x180', href: iconUrl },
        
        { tag: 'meta', name: 'msapplication-TileImage', content: iconUrl },
        { tag: 'meta', name: 'msapplication-TileColor', content: themeColor },
        { tag: 'meta', name: 'theme-color', content: themeColor },
        
        { tag: 'link', rel: 'manifest', href: '/manifest.json' }
    ];

    tags.forEach(attr => {
        const element = document.createElement(attr.tag);
        for (const key in attr) {
            if (key !== 'tag') {
                element.setAttribute(key, attr[key]);
            }
        }
        document.head.appendChild(element);
    });
})();
