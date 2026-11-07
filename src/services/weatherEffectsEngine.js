    export const WEATHER_CONFIGS = {
      // ==================== 一、雨系列 (9种) ====================
      '小雨': {
        category: 'rain',
        temp: '16°',
        feelsLike: '16°',
        wind: '东北风 2级',
        humidity: '97%',
        aqi: { text: '优 20', color: 'emerald' },
        alertText: '马上雨会变大',
        alertColor: '#3b82f6',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(30, 64, 175, 0.14), rgba(15, 23, 42, 0.30))',
        iconType: 'rain-light',
        rainCount: 55,
        rainSpeed: [9, 13],
        rainLen: [14, 22],
        rainWidth: 1.15,
        rainAlpha: 0.48,
        windAngle: 0.04,
        splashRate: 0.35,
        mistLevel: 0.06,
        poolLevel: 0.15
      },
      '中雨': {
        category: 'rain',
        temp: '15°',
        feelsLike: '14°',
        wind: '东北风 3级',
        humidity: '98%',
        aqi: { text: '优 18', color: 'emerald' },
        alertText: '持续中雨 · 出行请带伞',
        alertColor: '#38bdf8',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(29, 78, 216, 0.20), rgba(15, 23, 42, 0.38))',
        iconType: 'rain-med',
        rainCount: 115,
        rainSpeed: [13, 18],
        rainLen: [20, 30],
        rainWidth: 1.35,
        rainAlpha: 0.58,
        windAngle: 0.08,
        splashRate: 0.65,
        mistLevel: 0.15,
        poolLevel: 0.35
      },
      '大雨': {
        category: 'rain',
        temp: '14°',
        feelsLike: '12°',
        wind: '偏北风 4级',
        humidity: '99%',
        aqi: { text: '优 15', color: 'emerald' },
        alertText: '大雨滂沱 · 低洼路段注意积水',
        alertColor: '#0ea5e9',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(30, 58, 138, 0.28), rgba(15, 23, 42, 0.48))',
        iconType: 'rain-heavy',
        rainCount: 195,
        rainSpeed: [16, 22],
        rainLen: [26, 40],
        rainWidth: 1.55,
        rainAlpha: 0.68,
        windAngle: 0.13,
        splashRate: 0.9,
        mistLevel: 0.28,
        poolLevel: 0.55
      },
      '暴雨': {
        category: 'rain',
        temp: '13°',
        feelsLike: '11°',
        wind: '东北风 5级',
        humidity: '100%',
        aqi: { text: '优 12', color: 'emerald' },
        alertText: '暴雨黄色预警 · 搜索栏表面激起水雾',
        alertColor: '#eab308',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(23, 37, 84, 0.42), rgba(9, 14, 28, 0.60))',
        iconType: 'rain-storm',
        rainCount: 280,
        rainSpeed: [20, 27],
        rainLen: [34, 52],
        rainWidth: 1.75,
        rainAlpha: 0.75,
        windAngle: 0.18,
        splashRate: 1.2,
        mistLevel: 0.45,
        poolLevel: 0.78,
        waterCurtain: 0.3
      },
      '大暴雨': {
        category: 'rain',
        temp: '12°',
        feelsLike: '9°',
        wind: '狂风 6~7级',
        humidity: '100%',
        aqi: { text: '优 10', color: 'emerald' },
        alertText: '大暴雨橙色预警 · 狂风裹挟雨幕倾泻',
        alertColor: '#f97316',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(15, 23, 42, 0.55), rgba(6, 10, 22, 0.72))',
        iconType: 'rain-storm',
        rainCount: 380,
        rainSpeed: [23, 31],
        rainLen: [42, 65],
        rainWidth: 1.9,
        rainAlpha: 0.82,
        windAngle: 0.24,
        dynamicGust: true,
        splashRate: 1.5,
        mistLevel: 0.65,
        poolLevel: 0.92,
        waterCurtain: 0.6
      },
      '特大暴雨': {
        category: 'rain',
        temp: '11°',
        feelsLike: '7°',
        wind: '暴风 8~9级',
        humidity: '100%',
        aqi: { text: '优 8', color: 'emerald' },
        alertText: '特大暴雨红色预警 · 瀑布级雨幕倾盆而下',
        alertColor: '#ef4444',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(10, 15, 32, 0.68), rgba(4, 7, 16, 0.82))',
        iconType: 'rain-extreme',
        rainCount: 480,
        rainSpeed: [26, 36],
        rainLen: [50, 78],
        rainWidth: 2.15,
        rainAlpha: 0.9,
        windAngle: 0.28,
        dynamicGust: true,
        splashRate: 2.0,
        mistLevel: 0.85,
        poolLevel: 1.0,
        waterCurtain: 0.95,
        overflowCascade: true
      },
      '阵雨': {
        category: 'rain',
        temp: '17°',
        feelsLike: '16°',
        wind: '东南风 3级',
        humidity: '92%',
        aqi: { text: '优 22', color: 'emerald' },
        alertText: '局部阵雨 · 雨势呈波浪式忽大忽小',
        alertColor: '#38bdf8',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(30, 64, 175, 0.22), rgba(15, 23, 42, 0.36))',
        iconType: 'rain-shower',
        rainCount: 180,
        rainSpeed: [14, 21],
        rainLen: [22, 36],
        rainWidth: 1.4,
        rainAlpha: 0.65,
        windAngle: 0.12,
        showerModulation: true, // 波浪式阵雨强度调制
        splashRate: 0.8,
        mistLevel: 0.22,
        poolLevel: 0.4
      },
      '雷阵雨': {
        category: 'rain',
        temp: '14°',
        feelsLike: '12°',
        wind: '阵风 6级',
        humidity: '98%',
        aqi: { text: '优 16', color: 'emerald' },
        alertText: '雷电黄色预警 · 梯形区高频闪电劈落',
        alertColor: '#a855f7',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(49, 46, 129, 0.45), rgba(10, 12, 28, 0.68))',
        iconType: 'thunder-rain',
        rainCount: 240,
        rainSpeed: [18, 26],
        rainLen: [30, 48],
        rainWidth: 1.6,
        rainAlpha: 0.72,
        windAngle: 0.16,
        lightning: true,
        lightningFreq: 0.022,
        splashRate: 1.1,
        mistLevel: 0.35,
        poolLevel: 0.65
      },
      '雷阵雨伴有冰雹': {
        category: 'rain',
        temp: '9°',
        feelsLike: '5°',
        wind: '强阵风 7级',
        humidity: '96%',
        aqi: { text: '优 15', color: 'emerald' },
        alertText: '冰雹橙色预警 · 冰雹砸击搜索框剧烈弹跳',
        alertColor: '#22d3ee',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(22, 78, 99, 0.48), rgba(9, 15, 32, 0.72))',
        iconType: 'thunder-hail',
        rainCount: 190,
        rainSpeed: [19, 27],
        rainLen: [28, 44],
        rainWidth: 1.5,
        rainAlpha: 0.66,
        windAngle: 0.15,
        lightning: true,
        lightningFreq: 0.02,
        hailCount: 42, // 高弹性实体冰雹颗粒
        splashRate: 1.0,
        mistLevel: 0.3,
        poolLevel: 0.5
      },

      // ==================== 二、雪系列 (5种) ====================
      '阵雪': {
        category: 'snow',
        temp: '0°',
        feelsLike: '-3°',
        wind: '西北风 3级',
        humidity: '82%',
        aqi: { text: '优 18', color: 'emerald' },
        alertText: '阵雪飘落 · 随阵风波浪式旋舞',
        alertColor: '#7dd3fc',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(56, 189, 248, 0.16), rgba(15, 23, 42, 0.38))',
        iconType: 'snow-shower',
        snowCount: 95,
        snowSpeed: [1.4, 3.2],
        snowSize: [2.0, 5.0],
        windAngle: 0.15,
        showerModulation: true,
        snowDriftRate: 0.25
      },
      '小雪': {
        category: 'snow',
        temp: '-1°',
        feelsLike: '-4°',
        wind: '微风 1级',
        humidity: '80%',
        aqi: { text: '优 16', color: 'emerald' },
        alertText: '小雪微茫 · 晶莹雪花轻柔飘落',
        alertColor: '#bae6fd',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(125, 211, 252, 0.14), rgba(15, 23, 42, 0.32))',
        iconType: 'snow-light',
        snowCount: 65,
        snowSpeed: [0.9, 2.1],
        snowSize: [1.8, 4.2],
        windAngle: 0.03,
        snowDriftRate: 0.18
      },
      '中雪': {
        category: 'snow',
        temp: '-3°',
        feelsLike: '-7°',
        wind: '东北风 3级',
        humidity: '85%',
        aqi: { text: '优 14', color: 'emerald' },
        alertText: '中雪纷飞 · 搜索框顶部逐渐积起白雪',
        alertColor: '#38bdf8',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(56, 189, 248, 0.22), rgba(15, 23, 42, 0.45))',
        iconType: 'snow-med',
        snowCount: 135,
        snowSpeed: [1.5, 3.4],
        snowSize: [2.2, 6.2],
        crystalFlakes: true,
        windAngle: 0.08,
        snowDriftRate: 0.48
      },
      '大雪': {
        category: 'snow',
        temp: '-6°',
        feelsLike: '-11°',
        wind: '偏北风 4级',
        humidity: '88%',
        aqi: { text: '优 11', color: 'emerald' },
        alertText: '大雪预警 · 鹅毛大雪在搜索框堆积厚雪层',
        alertColor: '#0284c7',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(14, 165, 233, 0.28), rgba(15, 23, 42, 0.58))',
        iconType: 'snow-heavy',
        snowCount: 230,
        snowSpeed: [2.2, 4.8],
        snowSize: [2.5, 8.0],
        crystalFlakes: true,
        windAngle: 0.14,
        snowDriftRate: 0.78,
        mistLevel: 0.25
      },
      '暴雪': {
        category: 'snow',
        temp: '-12°',
        feelsLike: '-19°',
        wind: '暴风雪 7~8级',
        humidity: '92%',
        aqi: { text: '优 9', color: 'emerald' },
        alertText: '暴雪红色预警 · 狂风吹雪横扫梯形区',
        alertColor: '#f43f5e',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(186, 230, 253, 0.34), rgba(15, 23, 42, 0.72))',
        iconType: 'snow-blizzard',
        snowCount: 360,
        snowSpeed: [4.5, 9.5],
        snowSize: [2.0, 9.0],
        crystalFlakes: true,
        windAngle: 0.42,
        dynamicGust: true,
        blizzardRibbons: true,
        snowDriftRate: 1.0,
        mistLevel: 0.58
      },

      // ==================== 三、雨夹雪 & 冻雨 (2种) ====================
      '雨夹雪': {
        category: 'ice',
        temp: '1°',
        feelsLike: '-3°',
        wind: '东北风 4级',
        humidity: '94%',
        aqi: { text: '优 16', color: 'emerald' },
        alertText: '雨夹雪湿冷 · 雨丝与雪花交织形成半融雪水',
        alertColor: '#2dd4bf',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(20, 184, 166, 0.22), rgba(15, 23, 42, 0.48))',
        iconType: 'sleet',
        rainCount: 110,
        rainSpeed: [13, 19],
        rainLen: [18, 28],
        rainWidth: 1.3,
        rainAlpha: 0.55,
        snowCount: 95,
        snowSpeed: [2.2, 4.5],
        snowSize: [2.2, 6.0],
        windAngle: 0.14,
        splashRate: 0.55,
        snowDriftRate: 0.35,
        slushMode: true
      },
      '冻雨': {
        category: 'ice',
        temp: '-2°',
        feelsLike: '-7°',
        wind: '偏北风 3级',
        humidity: '96%',
        aqi: { text: '优 14', color: 'emerald' },
        alertText: '冻雨道路结冰预警 · 胶囊与搜索框凝结冰凌与冰柱',
        alertColor: '#06b6d4',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(6, 182, 212, 0.32), rgba(8, 25, 48, 0.65))',
        iconType: 'freezing-rain',
        rainCount: 150,
        rainSpeed: [15, 22],
        rainLen: [20, 32],
        rainWidth: 1.45,
        rainAlpha: 0.72,
        windAngle: 0.07,
        freezingRain: true, // 开启过冷水滴落地结冰、冰凌柱生长与冰霜纹理
        splashRate: 0.45,
        icicleLevel: 1.0
      },

      // ==================== 四、雾系列 (4种) ====================
      '浓雾': {
        category: 'fog',
        temp: '12°',
        feelsLike: '12°',
        wind: '静风 1级',
        humidity: '99%',
        aqi: { text: '良 58', color: 'sky' },
        alertText: '浓雾预警 · 能见度小于500米，丁达尔光束穿透',
        alertColor: '#94a3b8',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(148, 163, 184, 0.25), rgba(30, 41, 59, 0.45))',
        iconType: 'fog',
        fogLayers: 5,
        fogOpacity: 0.36,
        fogColor: [215, 228, 242],
        tyndallRays: 0.45,
        condensationDrops: 35
      },
      '强浓雾': {
        category: 'fog',
        temp: '11°',
        feelsLike: '11°',
        wind: '微风 1级',
        humidity: '100%',
        aqi: { text: '良 68', color: 'sky' },
        alertText: '强浓雾橙色预警 · 能见度小于200米，雾气翻涌',
        alertColor: '#f59e0b',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(148, 163, 184, 0.38), rgba(30, 41, 59, 0.58))',
        iconType: 'fog',
        fogLayers: 7,
        fogOpacity: 0.54,
        fogColor: [208, 222, 238],
        tyndallRays: 0.35,
        condensationDrops: 55
      },
      '大雾': {
        category: 'fog',
        temp: '10°',
        feelsLike: '10°',
        wind: '静风 0级',
        humidity: '100%',
        aqi: { text: '良 75', color: 'sky' },
        alertText: '大雾笼罩 · 梯形区域弥漫高浓度水汽团',
        alertColor: '#cbd5e1',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(203, 213, 225, 0.44), rgba(30, 41, 59, 0.65))',
        iconType: 'fog',
        fogLayers: 9,
        fogOpacity: 0.68,
        fogColor: [222, 232, 245],
        tyndallRays: 0.25,
        condensationDrops: 75
      },
      '特强浓雾': {
        category: 'fog',
        temp: '9°',
        feelsLike: '9°',
        wind: '静风 0级',
        humidity: '100%',
        aqi: { text: '轻度 105', color: 'amber' },
        alertText: '特强浓雾红色预警 · 能见度不足50米，暖黄雾灯穿透',
        alertColor: '#ef4444',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(226, 232, 240, 0.56), rgba(15, 23, 42, 0.78))',
        iconType: 'fog-extreme',
        fogLayers: 12,
        fogOpacity: 0.85,
        fogColor: [228, 234, 242],
        amberFogLight: true,
        condensationDrops: 110
      },

      // ==================== 五、霾与沙尘系列 (7种) ====================
      '中度霾': {
        category: 'haze',
        temp: '18°',
        feelsLike: '17°',
        wind: '微风 1级',
        humidity: '52%',
        aqi: { text: '中度 175', color: 'amber' },
        alertText: '中度霾 · 空气质量下降，悬浮微粒缓慢漂浮',
        alertColor: '#f59e0b',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(180, 142, 82, 0.30), rgba(45, 36, 24, 0.52))',
        iconType: 'haze',
        hazeDensity: 0.38,
        hazeColor: [186, 158, 112],
        dustCount: 95,
        dustSpeed: [0.3, 0.9],
        dustSize: [1.2, 3.0]
      },
      '重度霾': {
        category: 'haze',
        temp: '17°',
        feelsLike: '16°',
        wind: '静风 1级',
        humidity: '56%',
        aqi: { text: '重度 260', color: 'orange' },
        alertText: '重度霾橙色预警 · 浑浊灰褐PM2.5气溶胶弥漫',
        alertColor: '#f97316',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(161, 118, 62, 0.46), rgba(38, 28, 18, 0.68))',
        iconType: 'haze',
        hazeDensity: 0.58,
        hazeColor: [168, 134, 86],
        dustCount: 165,
        dustSpeed: [0.4, 1.1],
        dustSize: [1.5, 3.8]
      },
      '严重霾': {
        category: 'haze',
        temp: '16°',
        feelsLike: '15°',
        wind: '静风 0级',
        humidity: '60%',
        aqi: { text: '严重 385', color: 'rose' },
        alertText: '严重霾红色预警 · 室外能见度极低，请佩戴防护口罩',
        alertColor: '#e11d48',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(138, 92, 44, 0.62), rgba(32, 22, 14, 0.80))',
        iconType: 'haze-severe',
        hazeDensity: 0.78,
        hazeColor: [148, 108, 64],
        dustCount: 240,
        dustSpeed: [0.3, 0.9],
        dustSize: [1.8, 4.5]
      },
      '浮尘': {
        category: 'haze',
        temp: '20°',
        feelsLike: '18°',
        wind: '西北风 2级',
        humidity: '32%',
        aqi: { text: '轻度 145', color: 'amber' },
        alertText: '浮尘天气 · 细微黄土粉尘在梯形区内缓慢沉降',
        alertColor: '#d97706',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(202, 138, 4, 0.28), rgba(52, 34, 14, 0.50))',
        iconType: 'dust',
        hazeDensity: 0.32,
        hazeColor: [212, 168, 96],
        dustCount: 140,
        dustSpeed: [0.6, 1.4],
        dustSize: [1.2, 2.8],
        sandAccumulation: 0.2
      },
      '扬沙': {
        category: 'haze',
        temp: '21°',
        feelsLike: '19°',
        wind: '西北风 5级',
        humidity: '25%',
        aqi: { text: '重度 280', color: 'orange' },
        alertText: '扬沙天气 · 阵风卷起黄沙斜掠搜索框表面',
        alertColor: '#ea580c',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(217, 119, 6, 0.38), rgba(58, 32, 10, 0.62))',
        iconType: 'sand',
        hazeDensity: 0.48,
        hazeColor: [218, 152, 68],
        dustCount: 220,
        dustSpeed: [4.5, 9.0],
        dustSize: [1.5, 3.4],
        sandStormWind: 0.45,
        sandAccumulation: 0.45
      },
      '沙尘暴': {
        category: 'haze',
        temp: '19°',
        feelsLike: '15°',
        wind: '大风 7级',
        humidity: '18%',
        aqi: { text: '严重 460', color: 'rose' },
        alertText: '沙尘暴橙色预警 · 滚滚沙墙裹挟沙砾猛烈撞击',
        alertColor: '#ea580c',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(194, 65, 12, 0.54), rgba(48, 20, 6, 0.78))',
        iconType: 'sandstorm',
        hazeDensity: 0.72,
        hazeColor: [204, 112, 42],
        dustCount: 340,
        dustSpeed: [9.0, 16.0],
        dustSize: [1.6, 4.2],
        sandStormWind: 0.85,
        sandAccumulation: 0.75
      },
      '强沙尘暴': {
        category: 'haze',
        temp: '17°',
        feelsLike: '12°',
        wind: '烈风 9~10级',
        humidity: '12%',
        aqi: { text: '爆表 500+', color: 'rose' },
        alertText: '强沙尘暴红色预警 · 赤褐黑风风暴吞噬梯形视锥',
        alertColor: '#dc2626',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(154, 52, 18, 0.72), rgba(36, 12, 4, 0.88))',
        iconType: 'sandstorm-extreme',
        hazeDensity: 0.90,
        hazeColor: [178, 76, 24],
        dustCount: 460,
        dustSpeed: [14.0, 24.0],
        dustSize: [1.8, 5.0],
        sandStormWind: 1.25,
        sandAccumulation: 1.0
      },

      // ==================== 六、龙卷风 (1种) ====================
      '龙卷风': {
        category: 'tornado',
        temp: '13°',
        feelsLike: '6°',
        wind: '龙卷狂风 12级+',
        humidity: '92%',
        aqi: { text: '预警 88', color: 'amber' },
        alertText: '龙卷风紧急避险 · 3D漏斗涡旋贯通胶囊与搜索框！',
        alertColor: '#f43f5e',
        ambientBg: 'radial-gradient(circle at 50% 42%, rgba(15, 23, 42, 0.75), rgba(5, 8, 18, 0.88))',
        iconType: 'tornado',
        tornado: true,
        lightning: true,
        lightningFreq: 0.018
      }
    };

    export const ALL_WEATHER_NAMES = Object.keys(WEATHER_CONFIGS);


export function createWeatherEffectsEngine(canvas, elCapsule, elSearchBox, elAlertPill) {

    const state = {
      currentWeather: '小雨',
      config: WEATHER_CONFIGS['小雨'],
      showWireframe: false,
      clipToTrapezoid: true,
      autoCycle: false,
      autoCycleTimer: null,
      liveClock: false, // 默认展示还原截图的 16:43:7，点击时钟可切换实时秒表
      timeTick: 0,
      showerPhase: 0,
      gustOffset: 0,
      surfaceAccumulation: 0, // 积水/积雪/结冰/积沙渐进值 (0 -> 1)
      lightningFlash: 0,
      bolts: [],
      rainDrops: [],
      splashes: [],
      hailStones: [],
      snowFlakes: [],
      fogBands: [],
      dustParticles: [],
      tornadoParticles: [],
      icicles: [],
      searchBoxDrips: [],
      geometry: {
        topX1: 0, topX2: 0, topY: 0,
        botX1: 0, botX2: 0, botY: 0,
        alertRect: null,
        capsuleRect: null,
        searchRect: null
      }
    };
    const ctx = canvas.getContext("2d");
    const offscreenCanvas = document.createElement("canvas");
    const offCtx = offscreenCanvas.getContext("2d");
    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d");
    let maskKey = '';
    let frame = 0;
    let stopped = false;
    let paused = false;
    let previousTime = 0;
    let frameScale = 1;
    function updateTrapezoidGeometry() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(window.innerWidth || document.documentElement.clientWidth || 800));
      const h = Math.max(1, Math.floor(window.innerHeight || document.documentElement.clientHeight || 600));
      const targetW = Math.max(1, Math.round(w * dpr));
      const targetH = Math.max(1, Math.round(h * dpr));
      if (
        canvas.width !== targetW ||
        canvas.height !== targetH ||
        offscreenCanvas.width !== targetW ||
        offscreenCanvas.height !== targetH
      ) {
        canvas.width = targetW;
        canvas.height = targetH;
        offscreenCanvas.width = targetW;
        offscreenCanvas.height = targetH;
      }
      const capRect = elCapsule.getBoundingClientRect();
      const alertRect = elAlertPill?.getBoundingClientRect() || { left: 0, right: 0, top: -1000, bottom: -1000, width: 0 };
      const searchRect = elSearchBox.getBoundingClientRect();
      const topPad = 4;
      const botPad = 6;
      state.geometry = {
        topX1: capRect.left + topPad,
        topX2: capRect.right - topPad,
        topY: capRect.bottom - 2,
        botX1: searchRect.left + botPad,
        botX2: searchRect.right - botPad,
        botY: searchRect.top + 1, // 严格贴合搜索框上边框物理碰撞面
        searchBottomY: searchRect.bottom,
        capsuleRect: capRect,
        alertRect: alertRect,
        searchRect: searchRect,
        width: w,
        height: h,
        dpr: dpr
      };
      const g = state.geometry;
      const nextMaskKey = [w, h, dpr, g.topX1, g.topX2, g.topY, g.botX1, g.botX2, g.botY].join(',');
      if (nextMaskKey !== maskKey) {
        maskKey = nextMaskKey;
        maskCanvas.width = targetW;
        maskCanvas.height = targetH;
        maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (let y = Math.max(0, Math.ceil(g.topY)); y < Math.min(h, g.botY + 24); y++) {
          const span = getTrapezoidSpanAtY(y);
          const halfWidth = span.width * 0.58;
          const alpha = Math.min(1, (y - g.topY) / 20) * Math.max(0, Math.min(1, (g.botY + 24 - y) / 24));
          const gradient = maskCtx.createLinearGradient(span.centerX - halfWidth, y, span.centerX + halfWidth, y);
          gradient.addColorStop(0, 'rgba(255,255,255,0)');
          gradient.addColorStop(0.225, `rgba(255,255,255,${alpha})`);
          gradient.addColorStop(0.775, `rgba(255,255,255,${alpha})`);
          gradient.addColorStop(1, 'rgba(255,255,255,0)');
          maskCtx.fillStyle = gradient;
          maskCtx.fillRect(span.centerX - halfWidth, y, halfWidth * 2, 1);
        }
      }
    }
    function getTrapezoidSpanAtY(y) {
      const g = state.geometry;
      const t = Math.max(0, Math.min(1.15, (y - g.topY) / Math.max(1, g.botY - g.topY)));
      const leftX = g.topX1 + (g.botX1 - g.topX1) * t;
      const rightX = g.topX2 + (g.botX2 - g.topX2) * t;
      return { leftX, rightX, t, width: Math.max(1, rightX - leftX), centerX: (leftX + rightX) * 0.5 };
    }
    function getTrapezoidSoftAlpha(x, y, g) {
      const span = getTrapezoidSpanAtY(y);
      const vDistTop = y - g.topY;
      const topFade = Math.max(0, Math.min(1, (vDistTop + 6) / 28));
      const botFade = y <= g.botY ? 1 : Math.max(0, 1 - (y - g.botY) / 24);
      if (!state.clipToTrapezoid) {
        return topFade * botFade;
      }
      const halfW = span.width * 0.58;
      const distFromCenter = Math.abs(x - span.centerX);
      if (distFromCenter >= halfW) return 0;
      const normDist = distFromCenter / halfW;
      const hFade = normDist < 0.55
        ? 1
        : Math.pow(Math.cos(((normDist - 0.55) / 0.45) * (Math.PI * 0.5)), 1.6);
      return topFade * botFade * hFade;
    }
    function getUIOcclusionFactor(x, y, g) {
      const cr = g.capsuleRect;
      if (x >= cr.left && x <= cr.right && y >= cr.top && y <= cr.bottom - 3) {
        return 0.1;
      }
      return 1.0;
    }
    function initParticlesForWeather() {
      updateTrapezoidGeometry();
      const cfg = state.config;
      const g = state.geometry;
      state.rainDrops = [];
      state.splashes = [];
      state.hailStones = [];
      state.snowFlakes = [];
      state.fogBands = [];
      state.dustParticles = [];
      state.tornadoParticles = [];
      state.bolts = [];
      state.searchBoxDrips = [];
      state.icicles = [];
      state.lightningFlash = 0;
      state.surfaceAccumulation = 0.15;
      if (cfg.rainCount) {
        for (let i = 0; i < cfg.rainCount; i++) {
          state.rainDrops.push(spawnRainDrop(true));
        }
      }
      if (cfg.hailCount) {
        for (let i = 0; i < cfg.hailCount; i++) {
          state.hailStones.push(spawnHailStone(true));
        }
      }
      if (cfg.snowCount) {
        for (let i = 0; i < cfg.snowCount; i++) {
          state.snowFlakes.push(spawnSnowFlake(true));
        }
      }
      if (cfg.fogLayers) {
        for (let i = 0; i < cfg.fogLayers * 4; i++) {
          const t = Math.random();
          const y = g.topY + t * (g.botY - g.topY + 25);
          const span = getTrapezoidSpanAtY(y);
          state.fogBands.push({
            x: span.leftX + Math.random() * span.width,
            y: y,
            t: t,
            rx: 75 + Math.random() * 140,
            ry: 24 + Math.random() * 38,
            vx: (Math.random() - 0.5) * 0.7,
            phase: Math.random() * Math.PI * 2,
            alpha: (0.18 + Math.random() * 0.25) * (cfg.fogOpacity || 0.5)
          });
        }
      }
      if (cfg.dustCount) {
        for (let i = 0; i < cfg.dustCount; i++) {
          state.dustParticles.push(spawnDustParticle(true));
        }
      }
      if (cfg.freezingRain) {
        const capCount = 14;
        for (let i = 0; i < capCount; i++) {
          state.icicles.push({
            anchor: 'capsule',
            ratio: 0.08 + (i / (capCount - 1)) * 0.84,
            maxLen: 9 + Math.random() * 20,
            width: 2.5 + Math.random() * 3.2,
            dripTimer: Math.random() * 100
          });
        }
        const searchCount = 28;
        for (let i = 0; i < searchCount; i++) {
          state.icicles.push({
            anchor: 'search',
            ratio: 0.03 + (i / (searchCount - 1)) * 0.94,
            maxLen: 8 + Math.random() * 18,
            width: 2.2 + Math.random() * 3.5,
            dripTimer: Math.random() * 100
          });
        }
      }
      if (cfg.tornado) {
        const count = 420;
        for (let i = 0; i < count; i++) {
          const isDebris = i < 85;
          state.tornadoParticles.push({
            t: Math.random(), // 0 = 顶部胶囊处漏斗口, 1 = 底部搜索框处旋风底
            angle: Math.random() * Math.PI * 2,
            angVel: (0.065 + Math.random() * 0.075) * (isDebris ? 1.25 : 1),
            verticalSpeed: isDebris ? -(0.003 + Math.random() * 0.005) : (Math.random() - 0.48) * 0.003,
            radiusJitter: 0.78 + Math.random() * 0.44,
            size: isDebris ? (2.2 + Math.random() * 3.8) : (1.4 + Math.random() * 3.2),
            isDebris: isDebris,
            alpha: isDebris ? (0.55 + Math.random() * 0.4) : (0.25 + Math.random() * 0.45),
            colorTint: isDebris
              ? (Math.random() > 0.5 ? '#cbd5e1' : '#94a3b8')
              : (Math.random() > 0.3 ? '#e2e8f0' : '#64748b')
          });
        }
      }
    }
    function spawnRainDrop(randomY = false) {
      const cfg = state.config;
      const g = state.geometry;
      const t = randomY ? Math.random() : (Math.random() * 0.08);
      const y = g.topY + t * (g.botY - g.topY);
      const span = getTrapezoidSpanAtY(y);
      const ratio = Math.random(); // 在梯形横向的归一化位置 [0, 1]
      const speed = cfg.rainSpeed[0] + Math.random() * (cfg.rainSpeed[1] - cfg.rainSpeed[0]);
      const len = cfg.rainLen[0] + Math.random() * (cfg.rainLen[1] - cfg.rainLen[0]);
      const depth = 0.5 + Math.random() * 0.5; // 景深层次
      return {
        ratio,
        x: span.leftX + ratio * span.width,
        y,
        speed: speed * depth,
        len: len * depth,
        depth,
        alpha: (cfg.rainAlpha || 0.6) * depth
      };
    }
    function spawnHailStone(randomY = false) {
      const g = state.geometry;
      const t = randomY ? Math.random() * 0.8 : 0;
      const y = g.topY + t * (g.botY - g.topY);
      const span = getTrapezoidSpanAtY(y);
      const ratio = 0.06 + Math.random() * 0.88;
      return {
        x: span.leftX + ratio * span.width,
        y,
        vx: (Math.random() - 0.35) * 3.5,
        vy: 9 + Math.random() * 7,
        radius: 2.8 + Math.random() * 2.8,
        bounces: 0,
        maxBounces: 2 + (Math.random() > 0.5 ? 1 : 0),
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        alpha: 0.95
      };
    }
    function spawnSnowFlake(randomY = false) {
      const cfg = state.config;
      const g = state.geometry;
      const t = randomY ? Math.random() : -0.02;
      const y = g.topY + t * (g.botY - g.topY);
      const span = getTrapezoidSpanAtY(y);
      const ratio = Math.random();
      const size = cfg.snowSize[0] + Math.random() * (cfg.snowSize[1] - cfg.snowSize[0]);
      const speed = cfg.snowSpeed[0] + Math.random() * (cfg.snowSpeed[1] - cfg.snowSpeed[0]);
      return {
        ratio,
        x: span.leftX + ratio * span.width,
        y,
        size,
        speed,
        swayAmp: 0.6 + Math.random() * 1.8,
        swayFreq: 0.015 + Math.random() * 0.025,
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.04,
        isCrystal: cfg.crystalFlakes && size > 4.2 && Math.random() > 0.45,
        alpha: 0.55 + Math.random() * 0.45
      };
    }
    function spawnDustParticle(randomY = false) {
      const cfg = state.config;
      const g = state.geometry;
      const t = randomY ? Math.random() : Math.random();
      const y = g.topY + t * (g.botY - g.topY + 20);
      const span = getTrapezoidSpanAtY(y);
      const ratio = Math.random();
      const size = cfg.dustSize[0] + Math.random() * (cfg.dustSize[1] - cfg.dustSize[0]);
      const speed = cfg.dustSpeed[0] + Math.random() * (cfg.dustSpeed[1] - cfg.dustSpeed[0]);
      return {
        x: span.leftX + ratio * span.width,
        y,
        vx: cfg.sandStormWind ? speed : (Math.random() - 0.4) * speed,
        vy: cfg.sandStormWind ? (Math.random() - 0.35) * 2.2 : (0.15 + Math.random() * 0.45),
        size,
        alpha: 0.3 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2
      };
    }
    function triggerLightningBolt() {
      const g = state.geometry;
      const startX = g.capsuleRect.left + g.capsuleRect.width * (0.25 + Math.random() * 0.5);
      const startY = g.capsuleRect.bottom - 4;
      const endX = g.botX1 + (g.botX2 - g.botX1) * (0.15 + Math.random() * 0.7);
      const endY = g.botY;
      const segments = [];
      const steps = 14;
      let currX = startX;
      let currY = startY;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const targetX = startX + (endX - startX) * t;
        const targetY = startY + (endY - startY) * t;
        const jitter = (1 - Math.abs(t - 0.5) * 1.5) * 34;
        const nextX = i === steps ? endX : targetX + (Math.random() - 0.5) * jitter;
        const nextY = targetY;
        segments.push({ x1: currX, y1: currY, x2: nextX, y2: nextY, main: true });
        if (i > 2 && i < steps - 2 && Math.random() < 0.42) {
          let bx = nextX;
          let by = nextY;
          const branchSteps = 4 + Math.floor(Math.random() * 4);
          const branchDir = Math.random() > 0.5 ? 1 : -1;
          for (let b = 0; b < branchSteps; b++) {
            const nbx = bx + branchDir * (8 + Math.random() * 14);
            const nby = by + (endY - startY) / steps * (0.7 + Math.random() * 0.5);
            segments.push({ x1: bx, y1: by, x2: nbx, y2: nby, main: false });
            bx = nbx;
            by = nby;
          }
        }
        currX = nextX;
        currY = nextY;
      }
      for (let k = 0; k < 12; k++) {
        state.splashes.push({
          x: endX,
          y: endY,
          vx: (Math.random() - 0.5) * 7,
          vy: -(2.5 + Math.random() * 5.5),
          r: 1.5 + Math.random() * 2.2,
          alpha: 1,
          color: '#e0f2fe',
          isSpark: true
        });
      }
      state.bolts.push({
        segments,
        life: 1.0,
        color: state.currentWeather.includes('冰雹') ? '#67e8f9' : '#c084fc'
      });
      state.lightningFlash = 0.85;
    }
    function renderWeatherLoop(timestamp) {
      if (stopped) return;
      frameScale = previousTime ? Math.min(2, (timestamp - previousTime) / (1000 / 60)) : 1;
      previousTime = timestamp;
      updateTrapezoidGeometry();
      const g = state.geometry;
      if (!g.width || !g.height || offscreenCanvas.width === 0 || offscreenCanvas.height === 0) {
        frame = requestAnimationFrame(renderWeatherLoop);
        return;
      }
      const cfg = state.config;
      const dpr = g.dpr;
      state.timeTick += 0.016 * frameScale;
      state.showerPhase += 0.022 * frameScale;
      if (state.surfaceAccumulation < 1) {
        state.surfaceAccumulation = Math.min(1, state.surfaceAccumulation + 0.0025);
      }
      const modulation = cfg.showerModulation
        ? (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(state.showerPhase)))
        : 1.0;
      const gustAngle = cfg.dynamicGust
        ? Math.sin(state.timeTick * 1.8) * 0.12 + Math.cos(state.timeTick * 0.7) * 0.06
        : 0;
      const currentWindAngle = (cfg.windAngle || 0) + gustAngle;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, g.width, g.height);
      offCtx.save();
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offCtx.clearRect(0, 0, g.width, g.height);
      drawTrapezoidAtmosphere(offCtx, g, cfg, modulation);
      if (cfg.fogLayers) {
        drawFogSystem(offCtx, g, cfg);
      }
      if (cfg.hazeDensity) {
        drawHazeAndSandSystem(offCtx, g, cfg);
      }
      if (cfg.waterCurtain) {
        drawWaterCurtain(offCtx, g, cfg, currentWindAngle);
      }
      if (cfg.rainCount) {
        drawRainSystem(offCtx, g, cfg, modulation, currentWindAngle);
      }
      if (cfg.lightning) {
        if (Math.random() < 1 - Math.pow(1 - (cfg.lightningFreq || 0.02), frameScale)) {
          triggerLightningBolt();
        }
        drawLightningSystem(offCtx, g);
      }
      if (cfg.hailCount) {
        drawHailSystem(offCtx, g, cfg);
      }
      if (cfg.snowCount) {
        drawSnowSystem(offCtx, g, cfg, modulation, currentWindAngle);
      }
      if (cfg.tornado) {
        drawTornadoSystem(offCtx, g, cfg);
      }
      offCtx.globalCompositeOperation = 'destination-in';
      offCtx.drawImage(maskCanvas, 0, 0, g.width, g.height);
      offCtx.restore();
      if (offscreenCanvas.width > 0 && offscreenCanvas.height > 0) {
        ctx.drawImage(offscreenCanvas, 0, 0, g.width, g.height);
      }
      drawSurfaceInteractions(ctx, g, cfg, modulation);
      if (state.showWireframe) {
        drawTrapezoidWireframe(ctx, g);
      }
      ctx.restore();
      frame = requestAnimationFrame(renderWeatherLoop);
    }
    function drawTrapezoidAtmosphere(c, g, cfg, modulation) {
      c.save();
      const cx = (g.topX1 + g.topX2) * 0.5;
      const cy = (g.topY + g.botY) * 0.5;
      const rx = (g.botX2 - g.botX1) * 0.45;
      const ry = (g.botY - g.topY) * 0.55;
      if (cfg.tyndallRays) {
        for (let i = -1; i <= 1; i++) {
          const sway = Math.sin(state.timeTick * 0.6 + i * 1.5) * 18;
          const beamX = cx + i * 55 + sway;
          const rad = c.createRadialGradient(0, 0, 4, 0, 0, ry);
          rad.addColorStop(0, `rgba(255, 250, 235, ${cfg.tyndallRays * 0.12})`);
          rad.addColorStop(0.55, `rgba(255, 250, 235, ${cfg.tyndallRays * 0.05})`);
          rad.addColorStop(1, 'rgba(255, 250, 235, 0)');
          c.save();
          c.translate(beamX, cy);
          c.rotate(i * -0.18 + sway * 0.002);
          c.scale(0.32, 1);
          c.fillStyle = rad;
          c.beginPath();
          c.arc(0, 0, ry, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
      }
      if (cfg.amberFogLight) {
        const rad = c.createRadialGradient(cx, cy, 8, cx, cy, rx * 0.72);
        rad.addColorStop(0, 'rgba(251, 191, 36, 0.14)');
        rad.addColorStop(0.55, 'rgba(217, 119, 6, 0.05)');
        rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        c.fillStyle = rad;
        c.beginPath();
        c.arc(cx, cy, rx * 0.72, 0, Math.PI * 2);
        c.fill();
      }
      if (state.lightningFlash > 0.01) {
        const flashGrad = c.createRadialGradient(cx, cy, 10, cx, cy, rx);
        flashGrad.addColorStop(0, `rgba(216, 180, 254, ${state.lightningFlash * 0.30})`);
        flashGrad.addColorStop(0.55, `rgba(125, 211, 252, ${state.lightningFlash * 0.12})`);
        flashGrad.addColorStop(1, 'rgba(125, 211, 252, 0)');
        c.save();
        c.translate(cx, cy);
        c.scale(1, ry / Math.max(1, rx));
        c.fillStyle = flashGrad;
        c.beginPath();
        c.arc(0, 0, rx, 0, Math.PI * 2);
        c.fill();
        c.restore();
        state.lightningFlash *= 0.84;
      }
      c.restore();
    }
    function drawWaterCurtain(c, g, cfg, windAngle) {
      const ribbons = 7;
      const cy = (g.topY + g.botY) * 0.5;
      const ry = (g.botY - g.topY) * 0.48;
      for (let i = 0; i < ribbons; i++) {
        const ratio = 0.16 + (i / (ribbons - 1)) * 0.68 + Math.sin(state.timeTick * 2 + i) * 0.03;
        const edgeWeight = Math.sin(ratio * Math.PI);
        const span = getTrapezoidSpanAtY(cy);
        const cx = span.leftX + ratio * span.width;
        const alpha = (0.04 + 0.025 * Math.sin(state.timeTick * 4 + i * 1.7)) * cfg.waterCurtain * edgeWeight;
        const rad = c.createRadialGradient(0, 0, 2, 0, 0, ry);
        rad.addColorStop(0, `rgba(186, 230, 253, ${alpha * 1.2})`);
        rad.addColorStop(0.6, `rgba(125, 211, 252, ${alpha * 0.6})`);
        rad.addColorStop(1, 'rgba(186, 230, 253, 0)');
        c.save();
        c.translate(cx, cy);
        c.rotate(-windAngle * 0.65);
        c.scale(0.18, 1);
        c.fillStyle = rad;
        c.beginPath();
        c.arc(0, 0, ry, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }
    function drawRainSystem(c, g, cfg, modulation, windAngle) {
      const activeCount = Math.floor(state.rainDrops.length * modulation);
      c.lineCap = 'round';
      for (let i = 0; i < activeCount; i++) {
        const d = state.rainDrops[i];
        const span = getTrapezoidSpanAtY(d.y);
        d.y += d.speed * frameScale;
        d.ratio += windAngle * 0.0045;
        if (d.ratio > 0.98) d.ratio = 0.02;
        if (d.ratio < 0.02) d.ratio = 0.98;
        d.x = span.leftX + d.ratio * span.width;
        const softAlpha = getTrapezoidSoftAlpha(d.x, d.y, g);
        if (softAlpha > 0.02) {
          const dx = windAngle * d.len * 1.4;
          const dy = Math.min(d.len, Math.max(2, d.y - g.topY));
          c.strokeStyle = cfg.freezingRain
            ? `rgba(165, 243, 252, ${d.alpha * softAlpha})`
            : `rgba(186, 230, 253, ${d.alpha * softAlpha})`;
          c.lineWidth = (cfg.rainWidth || 1.2) * d.depth;
          c.beginPath();
          c.moveTo(d.x, d.y);
          c.lineTo(d.x - dx, d.y - dy);
          c.stroke();
        }
        const ar = g.alertRect;
        if (
          d.y >= ar.top &&
          d.y <= ar.top + d.speed + 4 &&
          d.x >= ar.left + 8 &&
          d.x <= ar.right - 8 &&
          Math.random() < 0.45
        ) {
          spawnSplash(d.x, ar.top + 1, cfg, 0.65);
          Object.assign(d, spawnRainDrop(false));
          continue;
        }
        if (d.y >= g.botY) {
          if (d.x >= g.searchRect.left + 14 && d.x <= g.searchRect.right - 14) {
            if (Math.random() < (cfg.splashRate || 0.5)) {
              spawnSplash(d.x, g.botY, cfg, 1.0);
            }
          }
          Object.assign(d, spawnRainDrop(false));
        }
      }
    }
    function spawnSplash(x, y, cfg, scale = 1) {
      if (state.splashes.length > 220) return;
      const count = cfg.rainWidth > 1.6 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        state.splashes.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 4.2 * scale,
          vy: -(1.4 + Math.random() * 3.4) * scale,
          r: (1.0 + Math.random() * 1.4) * scale,
          alpha: 0.85,
          color: cfg.freezingRain ? '#67e8f9' : '#bae6fd'
        });
      }
    }
    function drawLightningSystem(c, g) {
      for (let i = state.bolts.length - 1; i >= 0; i--) {
        const b = state.bolts[i];
        c.save();
        c.lineCap = 'round';
        c.lineJoin = 'round';
        for (const seg of b.segments) {
          c.strokeStyle = b.color;
          c.shadowColor = b.color;
          c.shadowBlur = seg.main ? 18 : 8;
          c.lineWidth = (seg.main ? 3.2 : 1.4) * b.life;
          c.globalAlpha = b.life;
          c.beginPath();
          c.moveTo(seg.x1, seg.y1);
          c.lineTo(seg.x2, seg.y2);
          c.stroke();
          if (seg.main) {
            c.strokeStyle = '#ffffff';
            c.lineWidth = 1.4 * b.life;
            c.beginPath();
            c.moveTo(seg.x1, seg.y1);
            c.lineTo(seg.x2, seg.y2);
            c.stroke();
          }
        }
        c.restore();
        b.life -= 0.075 * frameScale;
        if (b.life <= 0) state.bolts.splice(i, 1);
      }
    }
    function drawHailSystem(c, g, cfg) {
      const ar = g.alertRect;
      for (let i = 0; i < state.hailStones.length; i++) {
        const h = state.hailStones[i];
        h.x += h.vx * frameScale;
        h.y += h.vy * frameScale;
        h.vy += 0.48 * frameScale; // 重力加速度
        h.rot += h.vRot * frameScale;
        if (
          h.vy > 0 &&
          h.y + h.radius >= ar.top &&
          h.y - h.radius <= ar.top + 10 &&
          h.x >= ar.left + 4 &&
          h.x <= ar.right - 4
        ) {
          h.y = ar.top - h.radius;
          h.vy = -h.vy * 0.58;
          h.vx += (Math.random() - 0.5) * 4;
          h.bounces++;
          spawnIceShatter(h.x, ar.top);
        }
        if (
          h.vy > 0 &&
          h.y + h.radius >= g.botY &&
          h.x >= g.searchRect.left + 6 &&
          h.x <= g.searchRect.right - 6
        ) {
          h.y = g.botY - h.radius;
          h.vy = -h.vy * (0.48 + Math.random() * 0.15);
          h.vx = (h.vx * 0.8) + (Math.random() - 0.5) * 3.8;
          h.bounces++;
          spawnIceShatter(h.x, g.botY);
          if (h.bounces > h.maxBounces || Math.abs(h.vy) < 1.8) {
            Object.assign(h, spawnHailStone(false));
            continue;
          }
        }
        if (h.y > g.botY + 35) {
          Object.assign(h, spawnHailStone(false));
          continue;
        }
        c.save();
        c.translate(h.x, h.y);
        c.rotate(h.rot);
        const grad = c.createRadialGradient(-h.radius * 0.3, -h.radius * 0.3, 0.5, 0, 0, h.radius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.55, '#bae6fd');
        grad.addColorStop(1, '#0284c7');
        c.fillStyle = grad;
        c.shadowColor = 'rgba(125, 211, 252, 0.8)';
        c.shadowBlur = 6;
        c.beginPath();
        for (let k = 0; k < 6; k++) {
          const ang = (k * Math.PI) / 3;
          const px = Math.cos(ang) * h.radius;
          const py = Math.sin(ang) * h.radius;
          if (k === 0) c.moveTo(px, py);
          else c.lineTo(px, py);
        }
        c.closePath();
        c.fill();
        c.restore();
      }
    }
    function spawnIceShatter(x, y) {
      if (state.splashes.length > 220) return;
      for (let i = 0; i < 3; i++) {
        state.splashes.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 6,
          vy: -(2 + Math.random() * 4.5),
          r: 1.3 + Math.random() * 1.5,
          alpha: 0.95,
          color: '#e0f2fe'
        });
      }
    }
    function drawSnowSystem(c, g, cfg, modulation, windAngle) {
      if (cfg.blizzardRibbons) {
        for (let i = 0; i < 5; i++) {
          const progress = 0.1 + ((state.timeTick * 0.55 + i * 0.19) % 0.8);
          const y = g.topY + progress * (g.botY - g.topY);
          const span = getTrapezoidSpanAtY(y);
          const rx = span.width * 0.38;
          const grad = c.createRadialGradient(span.centerX, y, 4, span.centerX, y, rx);
          grad.addColorStop(0, 'rgba(224, 242, 254, 0.16)');
          grad.addColorStop(0.6, 'rgba(224, 242, 254, 0.06)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          c.save();
          c.translate(span.centerX, y);
          c.rotate(0.06);
          c.scale(1, 14 / Math.max(1, rx));
          c.fillStyle = grad;
          c.beginPath();
          c.arc(0, 0, rx, 0, Math.PI * 2);
          c.fill();
          c.restore();
        }
      }
      const activeCount = Math.floor(state.snowFlakes.length * modulation);
      for (let i = 0; i < activeCount; i++) {
        const s = state.snowFlakes[i];
        s.phase += s.swayFreq * frameScale;
        s.rot += s.vRot * frameScale;
        s.y += s.speed * frameScale;
        s.ratio += (windAngle * 0.008) + Math.sin(s.phase) * 0.0022;
        if (s.ratio > 0.98) s.ratio = 0.02;
        if (s.ratio < 0.02) s.ratio = 0.98;
        const span = getTrapezoidSpanAtY(s.y);
        s.x = span.leftX + s.ratio * span.width;
        const ar = g.alertRect;
        if (
          s.y >= ar.top &&
          s.y <= ar.top + s.speed + 2 &&
          s.x >= ar.left + 10 &&
          s.x <= ar.right - 10 &&
          Math.random() < 0.35
        ) {
          Object.assign(s, spawnSnowFlake(false));
          continue;
        }
        if (s.y >= g.botY) {
          Object.assign(s, spawnSnowFlake(false));
          continue;
        }
        const softAlpha = getTrapezoidSoftAlpha(s.x, s.y, g);
        if (softAlpha <= 0.02) continue;
        c.save();
        c.translate(s.x, s.y);
        c.rotate(s.rot);
        c.globalAlpha = s.alpha * softAlpha;
        if (s.isCrystal) {
          c.strokeStyle = '#ffffff';
          c.lineWidth = 1.15;
          for (let k = 0; k < 3; k++) {
            c.beginPath();
            c.moveTo(-s.size, 0);
            c.lineTo(s.size, 0);
            c.stroke();
            c.rotate(Math.PI / 3);
          }
        } else {
          const rad = c.createRadialGradient(0, 0, 0.2, 0, 0, s.size);
          rad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
          rad.addColorStop(0.6, 'rgba(224, 242, 254, 0.65)');
          rad.addColorStop(1, 'rgba(224, 242, 254, 0)');
          c.fillStyle = rad;
          c.beginPath();
          c.arc(0, 0, s.size, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
      }
    }
    function drawFogSystem(c, g, cfg) {
      const fc = cfg.fogColor || [215, 228, 242];
      for (const band of state.fogBands) {
        band.phase += 0.012;
        band.x += band.vx + Math.sin(band.phase) * 0.35;
        const span = getTrapezoidSpanAtY(band.y);
        if (band.x > span.rightX - 20) band.x = span.leftX + 20;
        if (band.x < span.leftX + 20) band.x = span.rightX - 20;
        const softAlpha = getTrapezoidSoftAlpha(band.x, band.y, g);
        const finalAlpha = band.alpha * softAlpha * 0.85;
        if (finalAlpha <= 0.01) continue;
        const grad = c.createRadialGradient(0, 0, 4, 0, 0, band.rx);
        grad.addColorStop(0, `rgba(${fc[0]}, ${fc[1]}, ${fc[2]}, ${finalAlpha})`);
        grad.addColorStop(0.5, `rgba(${fc[0]}, ${fc[1]}, ${fc[2]}, ${finalAlpha * 0.45})`);
        grad.addColorStop(1, `rgba(${fc[0]}, ${fc[1]}, ${fc[2]}, 0)`);
        c.save();
        c.translate(band.x, band.y);
        c.scale(1, band.ry / band.rx);
        c.fillStyle = grad;
        c.beginPath();
        c.arc(0, 0, band.rx, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }
    function drawHazeAndSandSystem(c, g, cfg) {
      const hc = cfg.hazeColor || [195, 148, 82];
      for (let i = 0; i < 5; i++) {
        const t = 0.18 + (i / 5) * 0.68;
        const y = g.topY + t * (g.botY - g.topY);
        const span = getTrapezoidSpanAtY(y);
        const drift = cfg.sandStormWind
          ? Math.sin(state.timeTick * 2.2 + i) * (span.width * 0.22)
          : Math.sin(state.timeTick * 0.5 + i * 1.5) * 30;
        const cx = span.centerX + drift;
        const rx = span.width * 0.36;
        const ry = 36 + (i % 2) * 14;
        const alpha = (cfg.hazeDensity || 0.4) * 0.22 * Math.sin(t * Math.PI);
        const grad = c.createRadialGradient(0, 0, 6, 0, 0, rx);
        grad.addColorStop(0, `rgba(${hc[0]}, ${hc[1]}, ${hc[2]}, ${alpha})`);
        grad.addColorStop(0.55, `rgba(${hc[0]}, ${hc[1]}, ${hc[2]}, ${alpha * 0.45})`);
        grad.addColorStop(1, `rgba(${hc[0]}, ${hc[1]}, ${hc[2]}, 0)`);
        c.save();
        c.translate(cx, y);
        c.scale(1, ry / Math.max(1, rx));
        c.fillStyle = grad;
        c.beginPath();
        c.arc(0, 0, rx, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      for (const p of state.dustParticles) {
        p.phase += 0.03;
        p.x += p.vx + Math.sin(p.phase) * 0.25;
        p.y += p.vy;
        const span = getTrapezoidSpanAtY(p.y);
        if (p.x > span.rightX) p.x = span.leftX + 4;
        if (p.x < span.leftX) p.x = span.rightX - 4;
        if (p.y > g.botY) {
          p.y = g.topY + Math.random() * 14;
        }
        if (p.y < g.topY) {
          p.y = g.botY - 4;
        }
        const softAlpha = getTrapezoidSoftAlpha(p.x, p.y, g);
        if (softAlpha <= 0.02) continue;
        if (cfg.sandStormWind && cfg.sandStormWind > 0.7) {
          c.strokeStyle = `rgba(${hc[0] + 30}, ${hc[1] + 25}, ${hc[2] + 15}, ${p.alpha * softAlpha})`;
          c.lineWidth = p.size * 0.7;
          c.beginPath();
          c.moveTo(p.x, p.y);
          c.lineTo(p.x - p.vx * 1.4, p.y - p.vy * 1.4);
          c.stroke();
        } else {
          c.fillStyle = `rgba(${hc[0] + 25}, ${hc[1] + 20}, ${hc[2] + 10}, ${p.alpha * softAlpha})`;
          c.beginPath();
          c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
    function drawTornadoSystem(c, g, cfg) {
      const centerX = (g.topX1 + g.topX2) * 0.5;
      const height = g.botY - g.topY;
      const getSpineX = (t) => {
        const sway1 = Math.sin(state.timeTick * 2.6 - t * 4.5) * (18 * Math.sin(t * Math.PI));
        const sway2 = Math.cos(state.timeTick * 1.7 + t * 3.2) * (10 * t);
        return centerX + sway1 + sway2;
      };
      const getFunnelRadius = (t) => {
        const topR = (g.topX2 - g.topX1) * 0.36;
        const midR = 34;
        const botR = 52;
        if (t < 0.78) {
          const k = t / 0.78;
          return topR * Math.pow(1 - k, 1.45) + midR * k;
        } else {
          const k = (t - 0.78) / 0.22;
          return midR + (botR - midR) * (k * k);
        }
      };
      const slices = 34;
      for (let i = 0; i < slices; i++) {
        const t = i / slices;
        const y = g.topY + t * height;
        const sx = getSpineX(t);
        const r = getFunnelRadius(t);
        const twist = state.timeTick * 8 - t * 14;
        c.save();
        c.translate(sx, y);
        c.rotate(Math.sin(twist) * 0.08);
        const grad = c.createLinearGradient(-r, 0, r, 0);
        grad.addColorStop(0, 'rgba(30, 41, 59, 0.05)');
        grad.addColorStop(0.25, 'rgba(71, 85, 105, 0.38)');
        grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.62)');
        grad.addColorStop(0.75, 'rgba(100, 116, 139, 0.38)');
        grad.addColorStop(1, 'rgba(30, 41, 59, 0.05)');
        c.fillStyle = grad;
        c.beginPath();
        c.ellipse(0, 0, r, 9 + (1 - t) * 7, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      for (const p of state.tornadoParticles) {
        p.angle += p.angVel * frameScale;
        p.t += p.verticalSpeed * frameScale;
        if (p.t < 0) p.t = 1;
        if (p.t > 1) p.t = 0;
        const y = g.topY + p.t * height;
        const sx = getSpineX(p.t);
        const baseR = getFunnelRadius(p.t) * p.radiusJitter * (p.isDebris ? 1.35 : 1.05);
        const cosA = Math.cos(p.angle);
        const sinA = Math.sin(p.angle); // 深度轴 (-1 后方, +1 前方)
        const x = sx + cosA * baseR;
        const py = y + sinA * (baseR * 0.22);
        const depthScale = 0.65 + (sinA + 1) * 0.35;
        c.save();
        c.globalAlpha = p.alpha * depthScale;
        if (p.isDebris) {
          c.translate(x, py);
          c.rotate(p.angle * 2);
          c.fillStyle = p.colorTint;
          c.fillRect(-p.size * 0.5, -p.size * 0.5, p.size * depthScale, p.size * 0.7 * depthScale);
        } else {
          c.strokeStyle = p.colorTint;
          c.lineWidth = p.size * 0.65 * depthScale;
          c.beginPath();
          c.moveTo(x, py);
          c.lineTo(x + sinA * 14, py - cosA * 3);
          c.stroke();
        }
        c.restore();
      }
      const botX = getSpineX(1.0);
      const swirlGrad = c.createRadialGradient(botX, g.botY, 4, botX, g.botY, 125);
      swirlGrad.addColorStop(0, 'rgba(226, 232, 240, 0.55)');
      swirlGrad.addColorStop(0.45, 'rgba(100, 116, 139, 0.32)');
      swirlGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      c.save();
      c.translate(botX, g.botY);
      c.scale(1, 0.22);
      c.fillStyle = swirlGrad;
      c.beginPath();
      c.arc(0, 0, 125, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    function drawSurfaceInteractions(c, g, cfg, modulation) {
      const sr = g.searchRect;
      const cr = g.capsuleRect;
      const ar = g.alertRect;
      const acc = state.surfaceAccumulation;
      for (let i = state.splashes.length - 1; i >= 0; i--) {
        const sp = state.splashes[i];
        sp.x += sp.vx * frameScale;
        sp.y += sp.vy * frameScale;
        sp.vy += 0.26 * frameScale;
        sp.alpha -= 0.045 * frameScale;
        if (sp.alpha <= 0) {
          state.splashes.splice(i, 1);
          continue;
        }
        if (sp.y < g.topY) continue;
        const splashAlpha = getTrapezoidSoftAlpha(sp.x, sp.y, g);
        if (splashAlpha <= 0.02) continue;
        c.save();
        c.fillStyle = sp.color || '#bae6fd';
        c.globalAlpha = sp.alpha * splashAlpha;
        if (sp.isSpark) {
          c.shadowColor = '#38bdf8';
          c.shadowBlur = 6;
        }
        c.beginPath();
        c.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      if (cfg.poolLevel) {
        const poolAlpha = cfg.poolLevel * 0.38 * modulation;
        const grad = c.createLinearGradient(sr.left + 26, sr.top, sr.right - 26, sr.top);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.25, `rgba(125, 211, 252, ${poolAlpha})`);
        grad.addColorStop(0.5, `rgba(224, 242, 254, ${poolAlpha * 1.2})`);
        grad.addColorStop(0.75, `rgba(125, 211, 252, ${poolAlpha})`);
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        c.fillStyle = grad;
        c.beginPath();
        c.roundRect(sr.left + 26, sr.top, sr.width - 52, 1.5, 1);
        c.fill();
        if (cfg.overflowCascade) {
          const corners = [sr.left + 12, sr.right - 12];
          for (const cx of corners) {
            const cGrad = c.createLinearGradient(cx, sr.top + 8, cx, sr.bottom + 20);
            cGrad.addColorStop(0, 'rgba(186, 230, 253, 0.38)');
            cGrad.addColorStop(0.6, 'rgba(125, 211, 252, 0.18)');
            cGrad.addColorStop(1, 'rgba(125, 211, 252, 0)');
            c.fillStyle = cGrad;
            c.beginPath();
            const wave = Math.sin(state.timeTick * 8 + cx) * 1.5;
            c.moveTo(cx - 1.5, sr.top + 8);
            c.quadraticCurveTo(cx + wave, sr.bottom, cx + wave * 1.2, sr.bottom + 20);
            c.lineTo(cx + 1.5 + wave * 1.2, sr.bottom + 20);
            c.quadraticCurveTo(cx + 1.5, sr.bottom, cx + 1.5, sr.top + 8);
            c.closePath();
            c.fill();
          }
        }
      }
      if (cfg.snowDriftRate) {
        const maxH = cfg.snowDriftRate * 6.5 * acc;
        if (maxH > 0.3) {
          c.save();
          const mounds = [
            { pos: 0.14, w: 76, h: 0.65 },
            { pos: 0.29, w: 115, h: 0.90 },
            { pos: 0.48, w: 140, h: 1.0 },
            { pos: 0.67, w: 118, h: 0.85 },
            { pos: 0.84, w: 86, h: 0.70 }
          ];
          for (const m of mounds) {
            const mx = sr.left + sr.width * m.pos;
            const my = sr.top + 1.5;
            const mh = maxH * m.h;
            const rad = c.createRadialGradient(0, 0, 1, 0, 0, m.w * 0.5);
            if (cfg.slushMode) {
              rad.addColorStop(0, 'rgba(224, 242, 254, 0.52)');
              rad.addColorStop(0.6, 'rgba(125, 211, 252, 0.22)');
              rad.addColorStop(1, 'rgba(125, 211, 252, 0)');
            } else {
              rad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
              rad.addColorStop(0.6, 'rgba(224, 242, 254, 0.35)');
              rad.addColorStop(1, 'rgba(224, 242, 254, 0)');
            }
            c.save();
            c.translate(mx, my);
            c.scale(1, mh / (m.w * 0.5));
            c.fillStyle = rad;
            c.beginPath();
            c.arc(0, 0, m.w * 0.5, 0, Math.PI * 2);
            c.fill();
            c.restore();
          }
          const ax = (ar.left + ar.right) * 0.5;
          const ay = ar.top + 1;
          const aw = (ar.width - 28) * 0.5;
          const aRad = c.createRadialGradient(0, 0, 1, 0, 0, aw);
          aRad.addColorStop(0, 'rgba(255, 255, 255, 0.68)');
          aRad.addColorStop(0.6, 'rgba(224, 242, 254, 0.28)');
          aRad.addColorStop(1, 'rgba(224, 242, 254, 0)');
          c.save();
          c.translate(ax, ay);
          c.scale(1, (maxH * 0.55) / Math.max(1, aw));
          c.fillStyle = aRad;
          c.beginPath();
          c.arc(0, 0, aw, 0, Math.PI * 2);
          c.fill();
          c.restore();
          c.restore();
        }
      }
      if (cfg.freezingRain) {
        c.save();
        const glazeGrad = c.createLinearGradient(sr.left + 24, sr.top, sr.right - 24, sr.top);
        glazeGrad.addColorStop(0, 'rgba(103, 232, 249, 0)');
        glazeGrad.addColorStop(0.2, 'rgba(224, 242, 254, 0.62)');
        glazeGrad.addColorStop(0.5, 'rgba(103, 232, 249, 0.78)');
        glazeGrad.addColorStop(0.8, 'rgba(224, 242, 254, 0.62)');
        glazeGrad.addColorStop(1, 'rgba(103, 232, 249, 0)');
        c.fillStyle = glazeGrad;
        c.beginPath();
        c.roundRect(sr.left + 24, sr.top - 0.5, sr.width - 48, 2.2, 2);
        c.fill();
        for (const ic of state.icicles) {
          const isCap = ic.anchor === 'capsule';
          const rect = isCap ? cr : sr;
          const baseX = rect.left + ic.ratio * rect.width;
          const baseY = isCap ? rect.bottom - 1 : rect.top + 1;
          const len = ic.maxLen * acc;
          const icGrad = c.createLinearGradient(baseX, baseY, baseX, baseY + len);
          icGrad.addColorStop(0, 'rgba(224, 242, 254, 0.82)');
          icGrad.addColorStop(0.6, 'rgba(103, 232, 249, 0.58)');
          icGrad.addColorStop(1, 'rgba(255, 255, 255, 0.88)');
          c.fillStyle = icGrad;
          c.beginPath();
          c.moveTo(baseX - ic.width * 0.5, baseY);
          c.lineTo(baseX + ic.width * 0.5, baseY);
          c.lineTo(baseX, baseY + len);
          c.closePath();
          c.fill();
          ic.dripTimer += 0.8 * frameScale;
          if (ic.dripTimer > 120) {
            ic.dripTimer = 0;
            if (isCap) {
              state.splashes.push({
                x: baseX,
                y: baseY + len,
                vx: 0,
                vy: 1.5,
                r: 1.4,
                alpha: 0.85,
                color: '#a5f3fc'
              });
            }
          }
        }
        c.restore();
      }
      if (cfg.sandAccumulation) {
        const maxH = cfg.sandAccumulation * 4.5 * acc;
        const sandGrad = c.createLinearGradient(sr.left + 28, sr.top, sr.right - 28, sr.top);
        sandGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
        sandGrad.addColorStop(0.25, 'rgba(245, 158, 11, 0.38)');
        sandGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.52)');
        sandGrad.addColorStop(0.75, 'rgba(245, 158, 11, 0.38)');
        sandGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        c.fillStyle = sandGrad;
        c.beginPath();
        c.roundRect(sr.left + 28, sr.top - 0.5, sr.width - 56, Math.max(1.5, maxH * 0.45), 2);
        c.fill();
      }
    }
    function drawTrapezoidWireframe(c, g) {
      c.save();
      c.strokeStyle = 'rgba(251, 191, 36, 0.78)';
      c.lineWidth = 1.5;
      c.setLineDash([6, 5]);
      c.beginPath();
      c.moveTo(g.topX1, g.topY);
      c.lineTo(g.topX2, g.topY);
      c.lineTo(g.botX2, g.botY);
      c.lineTo(g.botX1, g.botY);
      c.closePath();
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = '#fbbf24';
      const pts = [
        { x: g.topX1, y: g.topY, label: '上底左锚点 (天气胶囊)' },
        { x: g.topX2, y: g.topY, label: `上底宽: ${Math.round(g.topX2 - g.topX1)}px` },
        { x: g.botX1, y: g.botY, label: '下底左锚点 (搜索框物理面)' },
        { x: g.botX2, y: g.botY, label: `下底宽: ${Math.round(g.botX2 - g.botX1)}px` }
      ];
      c.font = '11px "JetBrains Mono", monospace';
      for (const p of pts) {
        c.beginPath();
        c.arc(p.x, p.y, 4, 0, Math.PI * 2);
        c.fill();
        c.fillText(p.label, p.x + 8, p.y - 6);
      }
      c.restore();
    }
    function getWeatherSvgMarkup(iconType) {
      if (iconType.startsWith('rain') || iconType === 'sleet' || iconType === 'freezing-rain') {
        const accent = iconType === 'freezing-rain' ? '#67e8f9' : '#38bdf8';
        return `
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path d="M7 15.5a4.5 4.5 0 01-.4-8.98 5.5 5.5 0 0110.76-1.12A4 4 0 0118 15.5H7z" stroke="${accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8.5 18.5l-1 2.5M12.5 18.5l-1 2.5M16.5 18.5l-1 2.5" stroke="${accent}" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        `;
      }
      if (iconType.startsWith('thunder')) {
        return `
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path d="M7 14.5a4.5 4.5 0 01-.4-8.98 5.5 5.5 0 0110.76-1.12A4 4 0 0118 14.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M13 12l-2.5 4.5h3L11 21" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
      }
      if (iconType.startsWith('snow')) {
        return `
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" stroke="#bae6fd" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="12" cy="12" r="2" fill="#e0f2fe"/>
          </svg>
        `;
      }
      if (iconType.startsWith('fog')) {
        return `
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path d="M4 9h16M6 13h12M4 17h14" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
      }
      if (iconType.startsWith('haze') || iconType.startsWith('dust') || iconType.startsWith('sand')) {
        return `
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path d="M4 10h13a2.5 2.5 0 10-2.5-2.5M3 14h16a2.5 2.5 0 11-2.5 2.5M5 18h10" stroke="#f59e0b" stroke-width="1.9" stroke-linecap="round"/>
          </svg>
        `;
      }
      if (iconType === 'tornado') {
        return `
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M6 10h13M8 14h10M10 18h6M11 21h3" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
      }
      return '';
    }

    return {
      setWeather(name) {
        state.currentWeather = name;
        state.config = WEATHER_CONFIGS[name];
        if (!state.config) return;
        initParticlesForWeather();
        if (!frame && !paused) frame = requestAnimationFrame(renderWeatherLoop);
      },
      setPaused(value) {
        paused = value;
        if (paused) {
          cancelAnimationFrame(frame);
          frame = 0;
        } else if (!frame && !stopped) {
          previousTime = 0;
          frame = requestAnimationFrame(renderWeatherLoop);
        }
      },
      destroy() {
        stopped = true;
        cancelAnimationFrame(frame);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
}
