// src/core/registry/groupIcons.ts

/**
 * Phosphor Icons 图标名称库
 * 仅包含名称字符串，组件渲染时需通过 Ph[Name] 动态索引
 */
export const groupIconNames = [
    // === 通用/基础 ===
    'Folder', 'House', 'Star', 'Heart', 'PushPin',
    'Tag', 'Flag', 'Bell', 'MagnifyingGlass', 'Trash',

    // === 工作/办公 ===
    'Briefcase', 'CalendarCheck', 'Clock', 'Notebook', 'ClipboardText',
    'PresentationChart', 'ArchiveBox', 'FileText', 'Printer', 'ProjectorScreen',
    'Paperclip', 'Signature', 'Tray', 'BriefcaseMetal',

    // === 开发/技术 ===
    'Code', 'Terminal', 'GitBranch', 'Bug', 'Cpu',
    'Database', 'Cloud', 'Rocket', 'Robot', 'Stack',
    'BracketsCurly', 'Browsers', 'DeviceMobile', 'Desktop', 'HardDrives',

    // === 生活/娱乐 ===
    'MusicNotes', 'FilmStrip', 'GameController', 'Camera', 'Headphones',
    'Microphone', 'SpeakerHigh', 'Ticket', 'Popcorn', 'Confetti',
    'BeerBottle', 'Pizza', 'Coffee', 'TShirt', 'Armchair',

    // === 学习/知识 ===
    'GraduationCap', 'BookOpen', 'PencilLine', 'Brain', 'Lightbulb',
    'Calculator', 'Student', 'Chalkboard', 'Scroll', 'Books',
    'Atom', 'Flask',

    // === 资产/工具 ===
    'Wrench', 'Gear', 'Toolbox', 'Key', 'Lock',
    'Flashlight', 'Hammer', 'Scissors', 'Magnet', 'Ruler',
    'PaintBrush', 'Eyedropper',

    // === 网络/链接 ===
    'LinkSimple', 'Globe', 'WifiHigh', 'Broadcast', 'Planet',
    'ShareNetwork', 'DownloadSimple', 'UploadSimple', 'CloudCheck',

    // === 财务/金融 ===
    'Wallet', 'CreditCard', 'Bank', 'Coins', 'CurrencyDollar',
    'TrendUp', 'PiggyBank', 'Receipt', 'ChartPieSlice',

    // === 通讯/社交 ===
    'ChatCircle', 'Envelope', 'Phone', 'PaperPlane', 'Megaphone',
    'ThumbsUp', 'User', 'Users', 'UsersThree', 'Smiley',
] as const;

export type GroupIconName = typeof groupIconNames[number];