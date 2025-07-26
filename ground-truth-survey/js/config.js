/**
 * Configuration file for the Ground Truth Survey application
 */

const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://txjbfqrbbtvzlxpeegkv.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4amJmcXJiYnR2emx4cGVlZ2t2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTU2NTQsImV4cCI6MjA2ODY5MTY1NH0.sE5UbwEOSnd9ED-k_Ix5OfdZbf7dmwlHZSjQQrEAyCo',
    
    // Table Names
    TABLES: {
        USERS: 'divisional_users',
        OFFICERS: 'officers_training',
        GROUND_TRUTH: 'ground_truth_survey',
        CROP_ASSESSMENT: 'crop_assessment'
    },
    
    // Division Data
    DIVISIONS: {
        1: "रायपुर संभाग",
        2: "दुर्ग संभाग",
        3: "बिलासपुर संभाग",
        4: "सरगुजा संभाग",
        5: "बस्तर संभाग",
        6: "प्रदेश"
    },
    
    // User Roles
    ROLES: {
        ADMIN: 'admin',
        DIVISION_ADMIN: 'division_admin'
    },
    
    // Application Settings
    APP_SETTINGS: {
        DATE_FORMAT: 'dd/MM/yyyy',
        ITEMS_PER_PAGE: 10,
        DEBOUNCE_DELAY: 300, // milliseconds
        AUTO_LOGOUT_TIME: 30 * 60 * 1000 // 30 minutes
    }
};

// District Data
CONFIG.DISTRICTS = {
    1: { name: "रायपुर", division_id: 1 },
    2: { name: "गरियाबंद", division_id: 1 },
    3: { name: "बलौदाबाजार", division_id: 1 },
    4: { name: "महासमुंद", division_id: 1 },
    5: { name: "धमतरी", division_id: 1 },
    6: { name: "दुर्ग", division_id: 2 },
    7: { name: "बालोद", division_id: 2 },
    8: { name: "बेमेतरा", division_id: 2 },
    9: { name: "कबीरधाम", division_id: 2 },
    10: { name: "राजनांदगांव", division_id: 2 },
    11: { name: "खैरागढ़", division_id: 2 },
    12: { name: "मोहला", division_id: 2 },
    13: { name: "बिलासपुर", division_id: 3 },
    14: { name: "गौरेला-पेण्ड्रा-मरवाही", division_id: 3 },
    15: { name: "मुंगेली", division_id: 3 },
    16: { name: "जांजगीर", division_id: 3 },
    17: { name: "सक्ती", division_id: 3 },
    18: { name: "कोरबा", division_id: 3 },
    19: { name: "रायगढ़", division_id: 3 },
    20: { name: "सारंगढ़-बिलाईगढ़", division_id: 3 },
    21: { name: "सरगुजा", division_id: 4 },
    22: { name: "सूरजपुर", division_id: 4 },
    23: { name: "बलरामपुर", division_id: 4 },
    24: { name: "कोरिया", division_id: 4 },
    25: { name: "मनेन्द्रगढ़-चिरमिरी", division_id: 4 },
    26: { name: "जशपुर", division_id: 4 },
    27: { name: "जगदलपुर", division_id: 5 },
    28: { name: "कोण्डागांव", division_id: 5 },
    29: { name: "कांकेर", division_id: 5 },
    30: { name: "दंतेवाड़ा", division_id: 5 },
    31: { name: "सुकमा", division_id: 5 },
    32: { name: "बीजापुर", division_id: 5 },
    33: { name: "नारायणपुर", division_id: 5 }
};

// Block Data
CONFIG.BLOCKS = {
    1: ["अभनपुर", "आरंग", "धरसींवा", "तिल्दा"],
    2: ["गरियाबंद", "छुरा", "देवभोग", "मैनपुर", "फिंगेश्वर"],
    3: ["बलौदाबाजार", "भाटापारा", "कसडोल", "पलारी", "सिमगा"],
    4: ["महासमुंद", "बागबाहरा", "पिथौरा", "बसना", "सरायपाली"],
    5: ["धमतरी", "नगरी", "कुरुद", "मगरलोड"],
    6: ["दुर्ग", "धमधा", "पाटन"],
    7: ["बालोद", "गुंडरदेही", "डौंडी", "डौंडीलोहारा", "गुरुर"],
    8: ["बेमेतरा", "बेरला", "साजा", "नवागढ़"],
    9: ["कबीरधाम", "बोडला", "कवर्धा", "पण्डरिया", "एस.लोहारा"],
    10: ["राजनांदगांव", "छुरिया", "डोंगरगढ़", "डोंगरगाँव"],
    11: ["खैरागढ़", "छुईखदान"],
    12: ["मोहला", "अम्बागढ़ चौकी", "मानपुर"],
    13: ["बिलासपुर", "कोटा", "बेलहा", "मस्तूरी", "तखतपुर"],
    14: ["मरवाही", "गौरेला-1", "गौरेला-2"],
    15: ["मुंगेली", "लोरमी", "पथरिया"],
    16: ["जांजगीर", "अकलतरा", "बलौदा", "बमहनीडीह", "नवागढ़", "पामगढ़"],
    17: ["सक्ती", "मलखरौदा", "डभरा", "जयजयपुर"],
    18: ["कोरबा", "करतला", "कटघोरा", "पाली", "पोड़ी उपरोड़ा"],
    19: ["रायगढ़", "धरमजयगढ़", "घरघोड़ा", "खरसिया", "लैलूंगा", "पुसौर", "तमनार"],
    20: ["बारमकेला", "सारंगढ़", "बिलाईगढ़"],
    21: ["अंबिकापुर", "बतौली", "लखनपुर", "लुंड्रा", "मैनपाट", "सीतापुर", "उदयपुर"],
    22: ["सूरजपुर", "भैयाथान", "ओडगी", "प्रतापपुर", "प्रेमनगर", "रामानुजगंज"],
    23: ["बलरामपुर", "वाड्रफनगर", "कुसमी", "राजपुर", "रामचंद्रपुर", "शंकरगढ़"],
    24: ["बैकुंठपुर", "खड़गवाना", "सोनहत"],
    25: ["भरतपुर", "खड़गवाना", "मनेंद्रगढ़"],
    26: ["बगीचा", "दुलदुला", "फरसाबहार", "जशपुर", "कुनकुरी", "मनोरा", "पत्थलगांव"],
    27: ["बकावंड", "बस्तनार", "बस्तर", "दरभा", "जगदलपुर", "लोहंडीगुड़ा", "तोकापाल"],
    28: ["बड़ेराजपुर", "केशकाल", "कोंडागांव", "माकड़ी", "फरसगांव"],
    29: ["अंतागढ़", "भानुप्रतापपुर", "चारामा", "दुर्गूकोंडल", "कांकेर", "नरहरपुर", "कोयलीबेड़ा"],
    30: ["कुवाकोंडा", "दंतेवाड़ा", "गीदम", "कटेकल्याण"],
    31: ["छिंदगढ़", "सुकमा", "कोंटा"],
    32: ["भैरमगढ़", "भोपालपट्नम", "बीजापुर", "उसूर"],
    33: ["नारायणपुर", "ओरछा"]
};

// Division Admin Titles
CONFIG.DIVISION_TITLES = {
    1: "संभागीय संयुक्त संचालक, रायपुर संभाग",
    2: "संभागीय संयुक्त संचालक, दुर्ग संभाग",
    3: "संभागीय संयुक्त संचालक, बिलासपुर संभाग",
    4: "संभागीय संयुक्त संचालक, सरगुजा संभाग",
    5: "संभागीय संयुक्त संचालक, बस्तर संभाग",
    6: "संचालक कृषि, छत्तीसगढ़"
};

// Division Admin Users
CONFIG.USERS = {
    "raipur_admin": { password: "raipur123", name: CONFIG.DIVISION_TITLES[1], division: CONFIG.DIVISIONS[1], division_id: 1 },
    "durg_admin": { password: "durg123", name: CONFIG.DIVISION_TITLES[2], division: CONFIG.DIVISIONS[2], division_id: 2 },
    "bilaspur_admin": { password: "bilaspur123", name: CONFIG.DIVISION_TITLES[3], division: CONFIG.DIVISIONS[3], division_id: 3 },
    "surguja_admin": { password: "surguja123", name: CONFIG.DIVISION_TITLES[4], division: CONFIG.DIVISIONS[4], division_id: 4 },
    "bastar_admin": { password: "bastar123", name: CONFIG.DIVISION_TITLES[5], division: CONFIG.DIVISIONS[5], division_id: 5 },
    "admin": { password: "admin123", name: CONFIG.DIVISION_TITLES[6], division: "All Divisions", division_id: 0 }
};
