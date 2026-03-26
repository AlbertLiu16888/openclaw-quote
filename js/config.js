// ===== Configuration =====
const CONFIG = {
    // Google Apps Script Web App URL (will be set after deployment)
    API_URL: 'https://script.google.com/macros/s/AKfycbw1HHwmZABnh7vgEcv-YHhSQIxtM2RpbrWU00JU3rLAnDkw7Q5EIR2zbruBRWrBQNPi/exec',

    // Password hash (SHA-256 of the password)
    // Default password: "freshgifts2026"
    PASSWORD_HASH: 'bcc4704e12365cbc759bdef32fa2e90b3fce40a461eabe5f681ad5cbacfd9531',

    // Company info
    COMPANY: {
        name: '異品科技股份有限公司',
        nameEn: 'Fresh Gifts Technology Co., Ltd.',
        phone: '',
        email: '',
        address: '',
        taxId: '',
    },

    // Tax rate
    TAX_RATE: 0.05,

    // Service fee rate
    SERVICE_FEE_RATE: 0.05,

    // Deposit ratio
    DEPOSIT_RATIO: 0.5,

    // Quote number prefix
    QUOTE_PREFIX: 'Q',

    // LINE Notify Token (set in admin)
    LINE_TOKEN: '',
};

// Default items database
const DEFAULT_ITEMS = [
    // 主題活動 (Standard)
    { id: 'A01', category: '主題活動', name: '福爾摩斯實境解謎', unit: '式', unitPrice: 200000, isStandard: true, description: 'Holmes escape room package' },
    { id: 'A02', category: '主題活動', name: '謎走大富翁', unit: '式', unitPrice: 200000, isStandard: true, description: 'Monopoly maze tasks' },
    { id: 'A03', category: '主題活動', name: '一起玩魷戲', unit: '式', unitPrice: 150000, isStandard: true, description: 'Squid Game activities' },
    { id: 'A04', category: '主題活動', name: '破風奪寶令', unit: '式', unitPrice: 100000, isStandard: true, description: 'Racing treasure quest' },

    // 活動關卡 (Add-on)
    { id: 'B01', category: '活動關卡', name: '終極密令A2', unit: '組', unitPrice: 8000, isStandard: false },
    { id: 'B02', category: '活動關卡', name: '終極密令B2', unit: '組', unitPrice: 8000, isStandard: false },
    { id: 'B03', category: '活動關卡', name: '我是神射手', unit: '組', unitPrice: 5000, isStandard: false },
    { id: 'B04', category: '活動關卡', name: '骨牌職人', unit: '組', unitPrice: 5000, isStandard: false },
    { id: 'B05', category: '活動關卡', name: '美式沙包', unit: '組', unitPrice: 5000, isStandard: false },
    { id: 'B06', category: '活動關卡', name: '超級抖餒', unit: '組', unitPrice: 5000, isStandard: false },

    // 保險
    { id: 'C01', category: '保險', name: '1日保險(24小時)', unit: '人', unitPrice: 50, isStandard: false },

    // 人力
    { id: 'D01', category: '人力', name: '景點引導工作人員', unit: '人', unitPrice: 1500, isStandard: false },
    { id: 'D02', category: '人力', name: '活動主持人', unit: '人', unitPrice: 8000, isStandard: false },
    { id: 'D03', category: '人力', name: '攝影師', unit: '人', unitPrice: 10000, isStandard: false },

    // 交通
    { id: 'E01', category: '交通', name: '遊覽車43人座 (南港-台中)', unit: '台', unitPrice: 16000, isStandard: false },
    { id: 'E02', category: '交通', name: '遊覽車43人座 (新竹-台中)', unit: '台', unitPrice: 15000, isStandard: false },
    { id: 'E03', category: '交通', name: '遊覽車43人座 (台南-台中)', unit: '台', unitPrice: 17000, isStandard: false },
    { id: 'E04', category: '交通', name: '遊覽車43人座 (自訂路線)', unit: '台', unitPrice: 15000, isStandard: false },

    // 餐飲
    { id: 'F01', category: '餐飲', name: '午餐 (中式桌菜)', unit: '桌', unitPrice: 11000, isStandard: false },
    { id: 'F02', category: '餐飲', name: '晚宴 (中式桌菜)', unit: '桌', unitPrice: 13000, isStandard: false },
    { id: 'F03', category: '餐飲', name: '自助餐 Buffet', unit: '人', unitPrice: 600, isStandard: false },
    { id: 'F04', category: '餐飲', name: '餐盒 (便當)', unit: '份', unitPrice: 120, isStandard: false },

    // 場地
    { id: 'G01', category: '場地', name: '場地租借 (半天)', unit: '時段', unitPrice: 30000, isStandard: false },
    { id: 'G02', category: '場地', name: '場地租借 (全天)', unit: '時段', unitPrice: 50000, isStandard: false },

    // 其他
    { id: 'H01', category: '扣抵/調整', name: '客戶已付場地訂金', unit: '式', unitPrice: -50000, isStandard: false },
    { id: 'H02', category: '扣抵/調整', name: '特殊折扣', unit: '式', unitPrice: 0, isStandard: false },
];

// Category display order
const CATEGORY_ORDER = ['主題活動', '活動關卡', '保險', '人力', '交通', '餐飲', '場地', '扣抵/調整', '代辦服務費'];
