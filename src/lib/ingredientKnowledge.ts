// 寵物成分知識庫
// 系統內建，不需要 AI API，即時分析

export type IngredientCategory =
  | 'protein'      // 蛋白質
  | 'carb'         // 碳水化合物
  | 'fat'          // 脂肪/油脂
  | 'fiber'        // 纖維
  | 'vitamin'      // 維生素
  | 'mineral'      // 礦物質
  | 'probiotic'    // 益生菌
  | 'functional'   // 功能性成分
  | 'additive'     // 添加劑
  | 'preservative' // 防腐劑
  | 'harmful'      // 有害成分
  | 'other'

export type RiskLevel = 'safe' | 'caution' | 'warning' | 'toxic'

export interface IngredientInfo {
  displayName: string                   // 顯示名稱
  patterns: string[]                    // 關鍵字（用於比對）
  category: IngredientCategory
  riskLevel: RiskLevel
  effect: string                        // 對寵物的影響說明
  symptoms: string[]                    // 相關症狀類型 (tear/skin/digestive/oral/ear/joint)
  tip?: string                          // 額外提示
}

// ─────────────────────────────────────────────
// 蛋白質來源
// ─────────────────────────────────────────────
const proteinIngredients: IngredientInfo[] = [
  {
    displayName: '雞肉',
    patterns: ['雞肉', '雞胸', '雞腿', '去骨雞', '新鮮雞肉', 'chicken'],
    category: 'protein',
    riskLevel: 'caution',
    effect: '常見蛋白質來源，消化吸收良好。但雞肉為常見過敏原，部分犬貓長期食用後可能引發淚痕增加、皮膚搔癢或耳朵發炎等過敏反應。',
    symptoms: ['tear', 'skin', 'ear'],
    tip: '若懷疑雞肉過敏，可嘗試換成單一蛋白（如羊肉、鴨肉）觀察 4-6 週',
  },
  {
    displayName: '雞肝 / 雞副產品',
    patterns: ['雞肝', '雞心', '雞胗', '雞副產品', '家禽副產品', 'chicken liver', 'chicken by-product'],
    category: 'protein',
    riskLevel: 'caution',
    effect: '富含維生素A及鐵質，適量補充有益。但副產品品質參差不齊，過量維生素A可能造成肝臟負擔；也是常見過敏原之一。',
    symptoms: ['skin', 'digestive'],
  },
  {
    displayName: '牛肉',
    patterns: ['牛肉', '牛', 'beef', '碎牛肉'],
    category: 'protein',
    riskLevel: 'caution',
    effect: '高蛋白、高鐵，適合活躍型犬貓。屬中等過敏原，部分個體食用後出現皮膚搔癢或腸胃不適。',
    symptoms: ['skin', 'digestive'],
  },
  {
    displayName: '豬肉',
    patterns: ['豬肉', '豬', 'pork', '豬心', '豬肝'],
    category: 'protein',
    riskLevel: 'caution',
    effect: '脂肪含量較高，消化性中等。不適合胰臟疾病或肥胖寵物，少數個體出現腸胃敏感。',
    symptoms: ['digestive'],
  },
  {
    displayName: '鮭魚 / 魚肉',
    patterns: ['鮭魚', '魚', '鱈魚', '鯖魚', '鮪魚', '沙丁魚', 'salmon', 'fish', 'cod', 'tuna'],
    category: 'protein',
    riskLevel: 'safe',
    effect: '優質蛋白質來源，天然富含 Omega-3（EPA、DHA），有助於減少炎症反應、改善皮膚和毛髮光澤、減少淚痕分泌。低過敏性。',
    symptoms: ['tear', 'skin'],
    tip: '魚類蛋白質是改善淚痕和皮膚問題的優選蛋白來源',
  },
  {
    displayName: '羊肉',
    patterns: ['羊肉', '羊', 'lamb', 'mutton'],
    category: 'protein',
    riskLevel: 'safe',
    effect: '低過敏性蛋白質，適合雞肉或牛肉過敏的寵物。富含維生素B12及鋅，有助於皮膚健康。',
    symptoms: ['skin'],
    tip: '適合換糧試驗的首選替代蛋白',
  },
  {
    displayName: '鴨肉',
    patterns: ['鴨肉', '鴨', 'duck'],
    category: 'protein',
    riskLevel: 'safe',
    effect: '低過敏性蛋白質，富含鐵質及維生素B群。適合有食物過敏史的寵物。',
    symptoms: ['skin'],
  },
  {
    displayName: '火雞肉',
    patterns: ['火雞', 'turkey'],
    category: 'protein',
    riskLevel: 'safe',
    effect: '低脂低過敏性蛋白質，含有色胺酸，有助於維持情緒穩定。適合體重控制及敏感型寵物。',
    symptoms: [],
  },
  {
    displayName: '蛋 / 蛋粉',
    patterns: ['蛋', '全蛋', '蛋粉', '蛋白', '蛋黃', 'egg'],
    category: 'protein',
    riskLevel: 'safe',
    effect: '生物效價最高的蛋白質來源，富含必需胺基酸。蛋黃富含膽鹼及葉黃素，有益眼睛健康。偶爾有個體對蛋白過敏。',
    symptoms: ['tear'],
  },
  {
    displayName: '豌豆蛋白 / 植物蛋白',
    patterns: ['豌豆蛋白', '豌豆', '扁豆', '大豆', '豆', 'pea protein', 'pea', 'soy', 'legume'],
    category: 'protein',
    riskLevel: 'caution',
    effect: '植物性蛋白，消化率較動物蛋白低。大豆是常見過敏原，可能引起皮膚炎及腸胃脹氣。高比例豌豆蛋白與擴張型心肌病（DCM）存在潛在關聯（仍在研究中）。',
    symptoms: ['skin', 'digestive'],
    tip: '建議搭配動物蛋白，而非作為主要蛋白來源',
  },
]

// ─────────────────────────────────────────────
// 碳水化合物
// ─────────────────────────────────────────────
const carbIngredients: IngredientInfo[] = [
  {
    displayName: '玉米 / 玉米澱粉',
    patterns: ['玉米', '玉米澱粉', '玉米麩', '玉米糖漿', 'corn', 'corn starch', 'corn syrup'],
    category: 'carb',
    riskLevel: 'caution',
    effect: '高升糖指數，對糖尿病或肥胖寵物不友善。玉米為常見過敏原，與部分品種的淚痕、皮膚炎及耳炎有關。',
    symptoms: ['tear', 'skin', 'ear'],
    tip: '淚痕問題明顯時，建議優先排除含玉米的食物',
  },
  {
    displayName: '小麥 / 麵粉',
    patterns: ['小麥', '麵粉', '麵筋', '麩質', 'wheat', 'flour', 'gluten'],
    category: 'carb',
    riskLevel: 'caution',
    effect: '含麩質，貓狗對麩質消化能力有限。小麥是第二常見的食物過敏原，可能引起皮膚搔癢、耳炎及腸胃問題。',
    symptoms: ['skin', 'ear', 'digestive'],
  },
  {
    displayName: '白米 / 碎米',
    patterns: ['白米', '碎米', '米', '精米', 'white rice', 'rice', 'broken rice'],
    category: 'carb',
    riskLevel: 'safe',
    effect: '易消化的碳水化合物，過敏性低，適合腸胃敏感的寵物。但升糖指數偏高，糖尿病或肥胖寵物宜適量。',
    symptoms: ['digestive'],
  },
  {
    displayName: '燕麥 / 大麥',
    patterns: ['燕麥', '大麥', '裸麥', 'oat', 'barley', 'oatmeal'],
    category: 'carb',
    riskLevel: 'safe',
    effect: '含水溶性纖維，有助調節血糖及腸道益生菌生長。升糖指數低於白米，不含麩質（燕麥），適合消化敏感型寵物。',
    symptoms: ['digestive'],
  },
  {
    displayName: '甘薯 / 地瓜',
    patterns: ['甘薯', '地瓜', '番薯', 'sweet potato', 'yam'],
    category: 'carb',
    riskLevel: 'safe',
    effect: '低過敏性，富含膳食纖維、維生素A及β-胡蘿蔔素。有助腸道健康及免疫功能。',
    symptoms: ['digestive'],
  },
  {
    displayName: '馬鈴薯 / 木薯',
    patterns: ['馬鈴薯', '洋芋', '木薯', '澱粉', 'potato', 'cassava', 'tapioca'],
    category: 'carb',
    riskLevel: 'caution',
    effect: '提供快速能量，但幾乎不含其他營養素。高比例可能影響整體飼料蛋白質品質。生馬鈴薯含龍葵鹼，有毒。',
    symptoms: [],
  },
]

// ─────────────────────────────────────────────
// 脂肪 / 油脂
// ─────────────────────────────────────────────
const fatIngredients: IngredientInfo[] = [
  {
    displayName: '魚油 / Omega-3',
    patterns: ['魚油', 'omega-3', 'omega3', 'epa', 'dha', 'fish oil', '深海魚油', 'omega'],
    category: 'fat',
    riskLevel: 'safe',
    effect: '含 EPA 及 DHA，為強效抗炎成分。可顯著改善淚痕、皮膚搔癢、乾燥及毛髮脫落問題，並有益關節健康。是寵物最推薦的油脂補充品。',
    symptoms: ['tear', 'skin', 'joint'],
    tip: '建議每日補充，是改善淚腺及皮膚問題的核心成分',
  },
  {
    displayName: '雞油 / 動物脂肪',
    patterns: ['雞油', '豬油', '牛脂', '動物脂肪', '動物油脂', 'chicken fat', 'animal fat', 'lard'],
    category: 'fat',
    riskLevel: 'safe',
    effect: '提供必需脂肪酸及脂溶性維生素，增加食物適口性。雞油含有亞油酸（Omega-6），適量有益皮膚健康，但過多可能促進炎症。',
    symptoms: ['skin'],
  },
  {
    displayName: '亞麻籽油',
    patterns: ['亞麻籽', '亞麻仁', '亞麻', 'flaxseed', 'linseed'],
    category: 'fat',
    riskLevel: 'safe',
    effect: '植物性 Omega-3 來源（ALA），但貓狗轉換 ALA 為 EPA/DHA 的效率極低（<5%），效果不如魚油顯著。',
    symptoms: ['skin'],
    tip: '貓咪對 ALA 轉換效率接近 0，建議選魚油替代',
  },
  {
    displayName: '椰子油',
    patterns: ['椰子油', 'coconut oil', 'coconut'],
    category: 'fat',
    riskLevel: 'caution',
    effect: '含中鏈脂肪酸（MCT），有些研究顯示對皮膚有益。但脂肪含量極高，過量可能引起腹瀉，不建議大量補充。',
    symptoms: ['skin', 'digestive'],
  },
  {
    displayName: '葵花油 / 植物油',
    patterns: ['葵花油', '葵花籽油', '植物油', '菜籽油', 'sunflower oil', 'vegetable oil', 'canola oil'],
    category: 'fat',
    riskLevel: 'caution',
    effect: '富含 Omega-6，適量有益皮膚，但現代寵物食品通常 Omega-6 已過量。過多 Omega-6 會加劇炎症反應，不利淚痕及皮膚問題。',
    symptoms: ['tear', 'skin'],
  },
]

// ─────────────────────────────────────────────
// 功能性成分
// ─────────────────────────────────────────────
const functionalIngredients: IngredientInfo[] = [
  {
    displayName: '益生菌',
    patterns: ['益生菌', '乳酸菌', '比菲德菌', '鼠李糖乳桿菌', 'probiotic', 'lactobacillus', 'bifidobacterium', 'enterococcus'],
    category: 'probiotic',
    riskLevel: 'safe',
    effect: '有助維持腸道菌叢平衡，改善消化吸收，減少腸胃問題（腹瀉、脹氣）。部分研究顯示益生菌可調節免疫，有助改善過敏相關症狀。',
    symptoms: ['digestive', 'skin'],
    tip: '建議選擇有明確菌株名稱（如 Lactobacillus acidophilus）及 CFU 數量的產品',
  },
  {
    displayName: '益生元 / 菊苣纖維',
    patterns: ['益生元', '菊苣', '菊糖', 'prebiotic', 'inulin', 'fructooligosaccharides', 'fos'],
    category: 'probiotic',
    riskLevel: 'safe',
    effect: '提供益生菌的食物來源，促進腸道好菌生長。有助改善排便規律性及糞便成形度。',
    symptoms: ['digestive'],
  },
  {
    displayName: '乳鐵蛋白',
    patterns: ['乳鐵蛋白', 'lactoferrin'],
    category: 'functional',
    riskLevel: 'safe',
    effect: '天然抗菌蛋白，有助抑制眼部分泌物中的細菌滋生，對改善淚痕具有直接幫助。同時具有抗炎及免疫調節作用。',
    symptoms: ['tear'],
    tip: '針對淚痕問題推薦補充',
  },
  {
    displayName: '牛磺酸',
    patterns: ['牛磺酸', 'taurine'],
    category: 'functional',
    riskLevel: 'safe',
    effect: '貓咪必需胺基酸，無法自行合成。對心臟功能、視力及繁殖功能至關重要。缺乏可能導致擴張型心肌病及視網膜病變。',
    symptoms: [],
    tip: '貓咪飼料必須含有牛磺酸，犬類也建議適量補充',
  },
  {
    displayName: '葡萄糖胺 / 軟骨素',
    patterns: ['葡萄糖胺', '氨基葡萄糖', '軟骨素', 'glucosamine', 'chondroitin'],
    category: 'functional',
    riskLevel: 'safe',
    effect: '支持關節軟骨健康，改善關節靈活度，適合中老年或大型犬貓補充。',
    symptoms: ['joint'],
  },
  {
    displayName: '膠原蛋白',
    patterns: ['膠原蛋白', '膠原', 'collagen'],
    category: 'functional',
    riskLevel: 'safe',
    effect: '有益關節、皮膚及毛髮健康。水解膠原蛋白吸收率較佳。',
    symptoms: ['skin', 'joint'],
  },
  {
    displayName: '薑黃素',
    patterns: ['薑黃', '薑黃素', 'turmeric', 'curcumin'],
    category: 'functional',
    riskLevel: 'caution',
    effect: '具有抗炎作用，可能有助關節及腸胃問題。但貓咪代謝能力有限，建議謹慎使用；過量可能干擾血液凝固。',
    symptoms: ['joint', 'digestive'],
    tip: '貓咪使用前請先諮詢獸醫',
  },
  {
    displayName: 'β-胡蘿蔔素 / 葉黃素',
    patterns: ['胡蘿蔔素', '葉黃素', 'beta-carotene', 'lutein', 'zeaxanthin'],
    category: 'functional',
    riskLevel: 'safe',
    effect: '抗氧化成分，有助眼睛健康及免疫功能。葉黃素可降低氧化壓力，對眼部分泌物有輔助改善效果。',
    symptoms: ['tear'],
  },
]

// ─────────────────────────────────────────────
// 添加劑 / 防腐劑
// ─────────────────────────────────────────────
const additiveIngredients: IngredientInfo[] = [
  {
    displayName: '人工色素',
    patterns: ['人工色素', '色素', 'artificial color', 'red 40', 'yellow 5', 'yellow 6', 'blue 2', '焦糖色'],
    category: 'additive',
    riskLevel: 'caution',
    effect: '寵物不需要食物顏色，人工色素對寵物無益。部分研究顯示可能加重過敏反應及皮膚問題，建議選擇不含人工色素的產品。',
    symptoms: ['skin'],
  },
  {
    displayName: '人工香料 / 調味料',
    patterns: ['人工香料', '香料', '調味料', '天然香料', 'artificial flavor', 'flavor', 'natural flavor'],
    category: 'additive',
    riskLevel: 'caution',
    effect: '增加食物適口性，但成分不透明。某些香料（尤其是洋蔥、大蒜萃取物）對寵物有毒。「天然香料」的成分範圍非常廣，需注意。',
    symptoms: ['digestive', 'tear'],
  },
  {
    displayName: 'BHA / BHT（化學防腐劑）',
    patterns: ['bha', 'bht', '丁基羥基苯甲醚', '二丁基羥基甲苯', 'ethoxyquin', '乙氧喹'],
    category: 'preservative',
    riskLevel: 'warning',
    effect: '化學防腐劑，BHA 和 BHT 在多個研究中被認為可能具有致癌性，雖在食品中使用量受規範，但長期暴露仍有疑慮。乙氧喹（Ethoxyquin）毒性更強，在許多國家已限制用量。',
    symptoms: ['skin'],
    tip: '建議選擇使用天然防腐劑（如維生素E/混合生育醇）的產品',
  },
  {
    displayName: '天然防腐劑（維生素E）',
    patterns: ['混合生育醇', '維生素e', 'mixed tocopherols', 'vitamin e', 'rosemary extract', '迷迭香萃取'],
    category: 'preservative',
    riskLevel: 'safe',
    effect: '以維生素E（生育醇）或迷迭香萃取物取代化學防腐劑，安全性高，同時具有抗氧化功效。',
    symptoms: [],
    tip: '選擇寵物食品時，這類防腐劑比化學防腐劑更理想',
  },
  {
    displayName: '糖 / 甜味劑',
    // 注意：不使用 '糖' 或 '葡萄糖'，因為低聚果糖（FOS益生元）、葡萄糖胺等
    // 常見有益成分含有「糖」字，會造成誤判
    patterns: ['砂糖', '蔗糖', '蜂蜜', '糖漿', '果糖糖漿', '高果糖', 'sugar', 'sucrose', 'honey', 'corn syrup', 'high fructose'],
    category: 'additive',
    riskLevel: 'warning',
    effect: '寵物食品不需要添加糖，會增加熱量並加速牙結石形成。長期攝入可能導致肥胖、糖尿病及口腔疾病。',
    symptoms: ['oral', 'digestive'],
    tip: '牙結石或口腔問題明顯時，尤其需要避免含糖食品',
  },
  {
    displayName: '木糖醇',
    patterns: ['木糖醇', 'xylitol'],
    category: 'harmful',
    riskLevel: 'toxic',
    effect: '對犬類高毒性！會造成低血糖和肝衰竭，少量即可致命。貓咪毒性研究較少，但同樣建議避免。',
    symptoms: ['digestive'],
    tip: '⚠️ 立即停止使用，如已誤食請立刻就醫',
  },
  {
    displayName: '卡拉膠',
    patterns: ['卡拉膠', 'carrageenan'],
    category: 'additive',
    riskLevel: 'caution',
    effect: '用於濕糧的增稠劑。部分研究顯示可能引起腸道炎症，對消化道敏感的寵物可能造成腸胃不適，目前仍有爭議。',
    symptoms: ['digestive'],
  },
]

// ─────────────────────────────────────────────
// 有害 / 禁忌成分
// ─────────────────────────────────────────────
const harmfulIngredients: IngredientInfo[] = [
  {
    displayName: '洋蔥 / 大蒜（毒性）',
    patterns: ['洋蔥', '大蒜', '蔥', '韭菜', 'onion', 'garlic', 'chive', 'leek'],
    category: 'harmful',
    riskLevel: 'toxic',
    effect: '含有二硫化物及硫代硫酸鹽，會破壞紅血球造成溶血性貧血。貓咪比狗更敏感。大蒜粉常見於某些寵物驅蚤產品，需特別注意。',
    symptoms: [],
    tip: '⚠️ 發現此成分請立即諮詢獸醫',
  },
  {
    displayName: '薄荷 / 茶樹精油',
    patterns: ['薄荷', '薄荷油', '茶樹', '精油', 'mint', 'peppermint', 'tea tree', 'essential oil'],
    category: 'harmful',
    riskLevel: 'warning',
    effect: '貓咪缺乏代謝精油的肝臟酵素，外用茶樹精油或薄荷可能引起神經毒性。某些洗毛精或牙膏含薄荷，需特別注意貓咪的安全。',
    symptoms: [],
    tip: '⚠️ 貓咪避免使用含精油的清潔產品',
  },
  {
    displayName: '酒精',
    patterns: ['酒精', 'alcohol', 'ethanol'],
    category: 'harmful',
    riskLevel: 'toxic',
    effect: '寵物對酒精極為敏感，少量即可引起中毒，出現嘔吐、定向感喪失、呼吸困難等症狀。',
    symptoms: [],
    tip: '⚠️ 若誤食請立刻就醫',
  },
  {
    displayName: '咖啡因',
    // 注意：不使用 '茶' 作為模式，因為茶籽油、茶多酚等常見成分含有「茶」字但不含咖啡因
    patterns: ['咖啡因', '咖啡', '茶葉', '綠茶萃取', '茶多酚', 'caffeine', 'coffee', 'green tea extract', 'tea leaf'],
    category: 'harmful',
    riskLevel: 'toxic',
    effect: '咖啡因對寵物有毒，可引起心律不整、抽搐及神經興奮。',
    symptoms: [],
  },
]

// ─────────────────────────────────────────────
// 維生素 / 礦物質
// ─────────────────────────────────────────────
const vitaminMineralIngredients: IngredientInfo[] = [
  {
    displayName: '維生素 A',
    patterns: ['維生素a', 'vitamin a', '視黃醇', 'retinol', 'beta-carotene'],
    category: 'vitamin',
    riskLevel: 'safe',
    effect: '維持視力、皮膚及免疫健康的必需維生素。注意：過量維生素A會中毒（尤其貓咪），需注意飼料中的總攝取量。',
    symptoms: ['skin', 'tear'],
  },
  {
    displayName: '維生素 C',
    patterns: ['維生素c', 'vitamin c', '抗壞血酸', 'ascorbic acid'],
    category: 'vitamin',
    riskLevel: 'safe',
    effect: '抗氧化劑，有助免疫系統及膠原蛋白合成。犬貓可自行合成維生素C，額外補充可提供抗氧化保護，但過量可能引起消化不適。',
    symptoms: ['skin'],
  },
  {
    displayName: '維生素 E',
    patterns: ['維生素e', 'vitamin e', '生育醇', 'tocopherol'],
    category: 'vitamin',
    riskLevel: 'safe',
    effect: '強效抗氧化劑，保護細胞膜免受自由基損傷。對皮膚和毛髮健康有直接幫助，也可作為天然防腐劑。',
    symptoms: ['skin'],
  },
  {
    displayName: '維生素 D',
    patterns: ['維生素d', 'vitamin d', '鈣化醇', 'cholecalciferol'],
    category: 'vitamin',
    riskLevel: 'caution',
    effect: '促進鈣磷吸收，骨骼健康必需。貓狗無法從陽光合成維生素D，需從食物攝取。注意：過量維生素D毒性極強，可能造成腎衰竭。',
    symptoms: ['joint'],
  },
  {
    displayName: '鈣',
    patterns: ['鈣', '碳酸鈣', '磷酸鈣', 'calcium', 'calcium carbonate'],
    category: 'mineral',
    riskLevel: 'safe',
    effect: '骨骼和牙齒的主要成分，神經及肌肉功能必需。成長中的幼犬貓尤其重要，但成犬貓若飼料已足夠，過量補充可能造成骨骼問題。',
    symptoms: ['joint', 'oral'],
  },
  {
    displayName: '鋅',
    patterns: ['鋅', '硫酸鋅', 'zinc', 'zinc sulfate', 'zinc gluconate'],
    category: 'mineral',
    riskLevel: 'safe',
    effect: '皮膚、毛髮及免疫功能必需礦物質。鋅缺乏會導致皮膚結痂、脫毛及傷口癒合緩慢。',
    symptoms: ['skin'],
    tip: '皮膚搔癢和脫毛明顯時，注意鋅的攝取是否足夠',
  },
  {
    displayName: '鐵',
    patterns: ['鐵', '硫酸亞鐵', 'iron', 'ferrous sulfate'],
    category: 'mineral',
    riskLevel: 'safe',
    effect: '血紅素合成必需，預防貧血。',
    symptoms: [],
  },
  {
    displayName: '碘',
    patterns: ['碘', '碘化鉀', 'iodine', 'potassium iodide'],
    category: 'mineral',
    riskLevel: 'safe',
    effect: '甲狀腺功能必需礦物質，代謝調節的關鍵。',
    symptoms: [],
  },
]

// ─────────────────────────────────────────────
// 合併所有知識庫
// ─────────────────────────────────────────────
export const INGREDIENT_KNOWLEDGE: IngredientInfo[] = [
  ...harmfulIngredients,        // 有害成分優先
  ...additiveIngredients,       // 添加劑
  ...functionalIngredients,     // 功能性成分
  ...fatIngredients,            // 油脂
  ...proteinIngredients,        // 蛋白質
  ...carbIngredients,           // 碳水化合物
  ...vitaminMineralIngredients, // 維生素礦物質
]

// ─────────────────────────────────────────────
// 補充建議規則（根據症狀和現有成分）
// ─────────────────────────────────────────────
export interface SupplementRule {
  name: string
  symptomTriggers: string[]   // 當有哪些症狀時觸發
  missingPatterns: string[]   // 且缺少這些成分時觸發
  reason: string
  priority: 'high' | 'medium' | 'low'
  examples: string
}

export const SUPPLEMENT_RULES: SupplementRule[] = [
  {
    name: 'Omega-3 魚油',
    symptomTriggers: ['tear', 'skin', 'ear', 'joint'],
    missingPatterns: ['魚油', 'omega-3', 'omega3', 'epa', 'dha'],
    reason: '目前飲食中缺乏 Omega-3，而 Omega-3（EPA/DHA）是改善淚腺分泌過多、皮膚炎症和關節問題的核心成分。',
    priority: 'high',
    examples: '天然深海魚油膠囊（犬貓專用）、含鮭魚的濕糧',
  },
  {
    name: '乳鐵蛋白',
    symptomTriggers: ['tear'],
    missingPatterns: ['乳鐵蛋白', 'lactoferrin'],
    reason: '目前飲食中未含乳鐵蛋白。乳鐵蛋白可抑制眼部分泌物細菌增生，直接針對淚痕問題。',
    priority: 'high',
    examples: '犬貓專用乳鐵蛋白粉、含乳鐵蛋白的保健品',
  },
  {
    name: '益生菌',
    symptomTriggers: ['digestive', 'skin', 'ear'],
    missingPatterns: ['益生菌', 'probiotic', '乳酸菌'],
    reason: '腸道菌叢失衡可能影響消化、皮膚和免疫，目前飲食中缺乏益生菌補充。',
    priority: 'medium',
    examples: '犬貓專用益生菌粉（含 Lactobacillus）、含益生菌的保健零食',
  },
  {
    name: '維生素 E',
    symptomTriggers: ['skin'],
    missingPatterns: ['維生素e', 'vitamin e', 'tocopherol', '生育醇'],
    reason: '皮膚搔癢可能與抗氧化不足有關，目前飲食中缺乏充足的維生素E補充。',
    priority: 'medium',
    examples: '含維生素E的皮膚保健品、添加混合生育醇的飼料',
  },
  {
    name: '葡萄糖胺 + 軟骨素',
    symptomTriggers: ['joint'],
    missingPatterns: ['葡萄糖胺', 'glucosamine', '軟骨素', 'chondroitin'],
    reason: '關節問題需要補充軟骨保護成分，目前飲食中缺乏葡萄糖胺及軟骨素。',
    priority: 'high',
    examples: '關節保健品（犬貓專用）、含骨頭湯底的飼料',
  },
  {
    name: '鋅',
    symptomTriggers: ['skin'],
    missingPatterns: ['鋅', 'zinc'],
    reason: '皮膚和毛髮健康與鋅密切相關，請確認目前飼料是否含有足夠的鋅。',
    priority: 'low',
    examples: '礦物質補充品、含鋅的保健食品',
  },
  {
    name: '膳食纖維',
    symptomTriggers: ['digestive'],
    missingPatterns: ['纖維', '益生元', '菊苣', 'fiber', 'prebiotic', 'inulin'],
    reason: '腸胃問題可能與纖維攝取不足有關，適量膳食纖維有助腸道健康。',
    priority: 'medium',
    examples: '含甘薯或燕麥的飼料、南瓜泥（天然纖維來源）',
  },
  {
    name: '牛磺酸（貓咪必需）',
    symptomTriggers: [],
    missingPatterns: ['牛磺酸', 'taurine'],
    reason: '貓咪無法自行合成牛磺酸，飲食中必須足量提供，否則可能影響心臟和視力。',
    priority: 'high',
    examples: '確認主食飼料含有牛磺酸標示',
  },
]
