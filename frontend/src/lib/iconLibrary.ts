import {
    // Jewelry / luxury
    Gem, Diamond, Crown, Sparkles, Sparkle, Watch,
    // Vehicles / transport
    Car, CarFront, Truck, Bike, Bus, Plane, Ship, TrainFront, ParkingCircle, Fuel, Anchor, Rocket,
    // Home / furniture
    Home, Sofa, Lamp, Bed, Warehouse, Building, Building2, Fan, Thermometer, Refrigerator, WashingMachine, DoorOpen, DoorClosed,
    // Food / catering (deliberately dense — the catering/Kiddush world is the app's growing primary channel)
    UtensilsCrossed, Utensils, Cake, Wine, Coffee, ChefHat, Soup, CookingPot, Salad, Pizza, IceCreamCone, Cookie, Sandwich, Croissant, Apple, Carrot, Egg, Milk, Popcorn, Beer, Martini, Cherry, Grape,
    // Cleaning / household
    SprayCan, Bath, Droplets, Trash2, Recycle,
    // Kids / family / education
    Baby, PersonStanding, GraduationCap, School, Users, Backpack, ToyBrick, Gamepad2,
    // Celebration / events
    PartyPopper, Gift, Star, CalendarHeart, Balloon, Music, Flame,
    // Clothing
    Shirt, Glasses,
    // Electronics / tech
    Laptop, Smartphone, Tv, Headphones, Camera, Battery, Wifi, Router, HardDrive, Keyboard, Mouse,
    // Tools / hardware
    Wrench, Hammer, Cog, Ruler, Drill,
    // Health / beauty
    HeartPulse, Stethoscope, Pill, Bandage, Scissors, Heart,
    // Sports / fitness
    Dumbbell, Trophy, Volleyball,
    // Pets / animals
    Dog, Cat, Fish, PawPrint, Bird, Rabbit, Turtle, Squirrel, Snail,
    // Books / office
    Book, BookOpen, Pencil, Printer, Calculator, FolderOpen, Mail, Phone, MessageCircle, Briefcase,
    // Nature / outdoors / weather
    TreePine, Flower2, Leaf, Sun, Moon, CloudSun, CloudRain, Snowflake, Sprout, Trees, Palmtree, Sunrise, Sunset, Feather, Compass, Globe, Map,
    // Generic retail / commerce
    Tag, Package, ShoppingBag, ShoppingCart, Store, Boxes, Award, ThumbsUp, CheckCircle2, Percent, BadgePercent, BadgeCheck,
    // Insurance / documents / legal / security
    Shield, ShieldCheck, FileText, Umbrella, Landmark, FileCheck, Scale, Gavel, Handshake, ClipboardCheck, Receipt, CreditCard, Banknote, PiggyBank, Lock, Cctv, Siren, AlertTriangle,
    // Real estate
    Key, KeyRound, MapPin,
    // Art / music / hobbies
    Palette, Paintbrush, Guitar, Film, Clapperboard, Bell, BellRing,
    LucideIcon,
} from 'lucide-react';

interface IconEntry {
    icon: LucideIcon;
    tags_he: string[];
    tags_en: string[];
}

/**
 * Single shared, hand-curated, hand-tagged icon library backing every admin icon picker
 * (product categories + verticals/worlds). lucide-react ships no per-icon keyword metadata at
 * all, so these tags are authored here. Every key must be a real lucide-react named export —
 * verified individually against the installed package before being added (a typo'd name fails at
 * build time via the import above, which is the intended safety net — see CLAUDE.md).
 *
 * Must stay a superset of every icon name ever assigned to a real ProductCategory/Vertical row —
 * removing a key here would make an existing row's icon silently fall back to Tag/Store.
 * Must match backend/app/schemas.py's VALID_ICON_NAMES exactly (same set of key strings).
 */
export const ICON_LIBRARY: Record<string, IconEntry> = {
    // Jewelry / luxury
    Gem: { icon: Gem, tags_he: ['תכשיטים', 'יהלום', 'אבן חן', 'יהלומים'], tags_en: ['jewelry', 'gem', 'diamond', 'gemstone'] },
    Diamond: { icon: Diamond, tags_he: ['יהלום', 'תכשיטים', 'ברק'], tags_en: ['diamond', 'jewelry', 'sparkle'] },
    Crown: { icon: Crown, tags_he: ['כתר', 'מלכות', 'יוקרה'], tags_en: ['crown', 'royal', 'luxury', 'premium'] },
    Sparkles: { icon: Sparkles, tags_he: ['ברק', 'נצנצים', 'מבריק'], tags_en: ['sparkle', 'shine', 'glitter'] },
    Sparkle: { icon: Sparkle, tags_he: ['ברק', 'נצנץ', 'כוכבית'], tags_en: ['sparkle', 'star', 'shine'] },
    Watch: { icon: Watch, tags_he: ['שעון', 'שעוני יד', 'זמן'], tags_en: ['watch', 'clock', 'time', 'wristwatch'] },

    // Vehicles / transport
    Car: { icon: Car, tags_he: ['רכב', 'אוטו', 'מכונית'], tags_en: ['car', 'vehicle', 'auto'] },
    CarFront: { icon: CarFront, tags_he: ['רכב', 'מכונית', 'חזית רכב'], tags_en: ['car', 'vehicle', 'sedan'] },
    Truck: { icon: Truck, tags_he: ['משאית', 'משלוח', 'הובלה'], tags_en: ['truck', 'delivery', 'shipping', 'transport'] },
    Bike: { icon: Bike, tags_he: ['אופניים', 'אופנוע', 'רכיבה'], tags_en: ['bike', 'bicycle', 'motorcycle', 'cycling'] },
    Bus: { icon: Bus, tags_he: ['אוטובוס', 'תחבורה ציבורית'], tags_en: ['bus', 'transit', 'transport'] },
    Plane: { icon: Plane, tags_he: ['מטוס', 'טיסה', 'נסיעות'], tags_en: ['plane', 'flight', 'travel', 'airplane'] },
    Ship: { icon: Ship, tags_he: ['ספינה', 'שיט', 'ים'], tags_en: ['ship', 'boat', 'sailing'] },
    TrainFront: { icon: TrainFront, tags_he: ['רכבת', 'תחבורה'], tags_en: ['train', 'railway', 'transit'] },
    ParkingCircle: { icon: ParkingCircle, tags_he: ['חניה', 'חנייה', 'פארקינג'], tags_en: ['parking', 'garage'] },
    Fuel: { icon: Fuel, tags_he: ['דלק', 'תדלוק', 'בנזין'], tags_en: ['fuel', 'gas', 'gasoline', 'petrol'] },
    Anchor: { icon: Anchor, tags_he: ['עוגן', 'ים', 'נמל'], tags_en: ['anchor', 'sea', 'port', 'marine'] },
    Rocket: { icon: Rocket, tags_he: ['רקטה', 'שיגור', 'מהיר'], tags_en: ['rocket', 'launch', 'fast', 'startup'] },

    // Home / furniture
    Home: { icon: Home, tags_he: ['בית', 'דירה', 'מגורים'], tags_en: ['home', 'house', 'apartment', 'residence'] },
    Sofa: { icon: Sofa, tags_he: ['ספה', 'ריהוט', 'סלון'], tags_en: ['sofa', 'furniture', 'couch', 'living room'] },
    Lamp: { icon: Lamp, tags_he: ['מנורה', 'תאורה', 'אור'], tags_en: ['lamp', 'lighting', 'light'] },
    Bed: { icon: Bed, tags_he: ['מיטה', 'שינה', 'חדר שינה'], tags_en: ['bed', 'sleep', 'bedroom'] },
    Warehouse: { icon: Warehouse, tags_he: ['מחסן', 'אחסון', 'מלאי'], tags_en: ['warehouse', 'storage', 'inventory'] },
    Building: { icon: Building, tags_he: ['בניין', 'משרד', 'נדל"ן'], tags_en: ['building', 'office', 'real estate'] },
    Building2: { icon: Building2, tags_he: ['בניין', 'עסק', 'נדל"ן', 'ביטוח'], tags_en: ['building', 'business', 'real estate', 'insurance'] },
    Fan: { icon: Fan, tags_he: ['מאוורר', 'קירור', 'אוורור'], tags_en: ['fan', 'cooling', 'ventilation'] },
    Thermometer: { icon: Thermometer, tags_he: ['טמפרטורה', 'מדחום', 'חום'], tags_en: ['thermometer', 'temperature', 'heat'] },
    Refrigerator: { icon: Refrigerator, tags_he: ['מקרר', 'קירור', 'מטבח'], tags_en: ['fridge', 'refrigerator', 'kitchen', 'cooling'] },
    WashingMachine: { icon: WashingMachine, tags_he: ['מכונת כביסה', 'כביסה', 'ניקיון'], tags_en: ['washing machine', 'laundry', 'cleaning'] },
    DoorOpen: { icon: DoorOpen, tags_he: ['דלת', 'כניסה', 'פתוח'], tags_en: ['door', 'entrance', 'open'] },
    DoorClosed: { icon: DoorClosed, tags_he: ['דלת', 'סגור', 'פרטיות'], tags_en: ['door', 'closed', 'privacy'] },

    // Food / catering
    UtensilsCrossed: { icon: UtensilsCrossed, tags_he: ['אוכל', 'קייטרינג', 'מסעדה', 'חד פעמי'], tags_en: ['food', 'catering', 'restaurant', 'dining', 'disposable'] },
    Utensils: { icon: Utensils, tags_he: ['סכום', 'כלים חד פעמיים', 'אוכל', 'חד פעמי'], tags_en: ['cutlery', 'disposable tableware', 'dining', 'utensils'] },
    Cake: { icon: Cake, tags_he: ['עוגה', 'שמחה', 'בר מצווה', 'יום הולדת', 'חגיגה'], tags_en: ['cake', 'celebration', 'bar mitzvah', 'birthday', 'party'] },
    Wine: { icon: Wine, tags_he: ['יין', 'קידוש', 'לקידוש', 'שבת'], tags_en: ['wine', 'kiddush', 'shabbat', 'drink'] },
    Coffee: { icon: Coffee, tags_he: ['קפה', 'משקה חם', 'בית קפה'], tags_en: ['coffee', 'hot drink', 'cafe'] },
    ChefHat: { icon: ChefHat, tags_he: ['שף', 'בישול', 'מטבח', 'קייטרינג'], tags_en: ['chef', 'cooking', 'kitchen', 'catering'] },
    Soup: { icon: Soup, tags_he: ['מרק', 'אוכל חם'], tags_en: ['soup', 'hot food'] },
    CookingPot: { icon: CookingPot, tags_he: ['סיר', 'בישול', 'מטבח'], tags_en: ['pot', 'cooking', 'kitchen'] },
    Salad: { icon: Salad, tags_he: ['סלט', 'ירקות', 'בריא'], tags_en: ['salad', 'vegetables', 'healthy'] },
    Pizza: { icon: Pizza, tags_he: ['פיצה', 'אוכל מהיר'], tags_en: ['pizza', 'fast food'] },
    IceCreamCone: { icon: IceCreamCone, tags_he: ['גלידה', 'קינוח', 'קיץ'], tags_en: ['ice cream', 'dessert', 'summer'] },
    Cookie: { icon: Cookie, tags_he: ['עוגיה', 'מאפה', 'קינוח'], tags_en: ['cookie', 'pastry', 'dessert', 'baked goods'] },
    Sandwich: { icon: Sandwich, tags_he: ['כריך', 'סנדוויץ'], tags_en: ['sandwich'] },
    Croissant: { icon: Croissant, tags_he: ['קרואסון', 'מאפה', 'בוקר'], tags_en: ['croissant', 'pastry', 'breakfast', 'bakery'] },
    Apple: { icon: Apple, tags_he: ['תפוח', 'פרי', 'בריא'], tags_en: ['apple', 'fruit', 'healthy'] },
    Carrot: { icon: Carrot, tags_he: ['גזר', 'ירק', 'ירקות'], tags_en: ['carrot', 'vegetable'] },
    Egg: { icon: Egg, tags_he: ['ביצה', 'ביצים', 'בוקר'], tags_en: ['egg', 'breakfast'] },
    Milk: { icon: Milk, tags_he: ['חלב', 'מוצרי חלב'], tags_en: ['milk', 'dairy'] },
    Popcorn: { icon: Popcorn, tags_he: ['פופקורן', 'חטיף', 'בידור'], tags_en: ['popcorn', 'snack', 'entertainment'] },
    Beer: { icon: Beer, tags_he: ['בירה', 'משקה'], tags_en: ['beer', 'drink'] },
    Martini: { icon: Martini, tags_he: ['קוקטייל', 'משקה', 'בר'], tags_en: ['cocktail', 'drink', 'bar'] },
    Cherry: { icon: Cherry, tags_he: ['דובדבן', 'פרי'], tags_en: ['cherry', 'fruit'] },
    Grape: { icon: Grape, tags_he: ['ענבים', 'פרי', 'יין'], tags_en: ['grapes', 'fruit', 'wine'] },

    // Cleaning / household
    SprayCan: { icon: SprayCan, tags_he: ['ניקיון', 'נקיון', 'ספריי', 'חומרי ניקוי'], tags_en: ['cleaning', 'spray', 'detergent', 'household'] },
    Bath: { icon: Bath, tags_he: ['אמבטיה', 'טואלטיקה', 'מוצרי טואלטיקה', 'רחצה'], tags_en: ['bath', 'toiletries', 'bathroom', 'hygiene'] },
    Droplets: { icon: Droplets, tags_he: ['נוזל', 'סבון', 'ניקיון', 'מים'], tags_en: ['liquid', 'soap', 'cleaning', 'water'] },
    Trash2: { icon: Trash2, tags_he: ['אשפה', 'זבל', 'פסולת'], tags_en: ['trash', 'garbage', 'waste', 'bin'] },
    Recycle: { icon: Recycle, tags_he: ['מיחזור', 'קיימות', 'ירוק'], tags_en: ['recycle', 'sustainability', 'eco'] },

    // Kids / family / education
    Baby: { icon: Baby, tags_he: ['תינוק', 'ילדים', 'לילדי הקהילה', 'משפחה'], tags_en: ['baby', 'kids', 'children', 'family'] },
    PersonStanding: { icon: PersonStanding, tags_he: ['אדם', 'קהילה', 'משתתפים'], tags_en: ['person', 'community', 'people'] },
    GraduationCap: { icon: GraduationCap, tags_he: ['סיום', 'לימודים', 'חינוך', 'בוגר'], tags_en: ['graduation', 'education', 'school', 'study'] },
    School: { icon: School, tags_he: ['בית ספר', 'חינוך', 'לימודים'], tags_en: ['school', 'education'] },
    Users: { icon: Users, tags_he: ['קהילה', 'קבוצה', 'חברים', 'משפחה'], tags_en: ['community', 'group', 'people', 'family'] },
    Backpack: { icon: Backpack, tags_he: ['תיק', 'ילקוט', 'בית ספר'], tags_en: ['backpack', 'school bag', 'kids'] },
    ToyBrick: { icon: ToyBrick, tags_he: ['צעצוע', 'משחק', 'ילדים'], tags_en: ['toy', 'play', 'kids'] },
    Gamepad2: { icon: Gamepad2, tags_he: ['משחק', 'בידור', 'ילדים'], tags_en: ['gaming', 'entertainment', 'kids'] },

    // Celebration / events
    PartyPopper: { icon: PartyPopper, tags_he: ['מסיבה', 'חגיגה', 'שמחה', 'אירוע', 'בר מצווה'], tags_en: ['party', 'celebration', 'event', 'bar mitzvah'] },
    Gift: { icon: Gift, tags_he: ['מתנה', 'שי', 'הפתעה'], tags_en: ['gift', 'present', 'surprise'] },
    Star: { icon: Star, tags_he: ['כוכב', 'מועדף', 'מיוחד', 'כוכב דוד'], tags_en: ['star', 'favorite', 'special'] },
    CalendarHeart: { icon: CalendarHeart, tags_he: ['אירוע', 'תאריך', 'לוח שנה', 'שמחה'], tags_en: ['event', 'date', 'calendar', 'occasion'] },
    Balloon: { icon: Balloon, tags_he: ['בלון', 'מסיבה', 'חגיגה'], tags_en: ['balloon', 'party', 'celebration'] },
    Music: { icon: Music, tags_he: ['מוזיקה', 'שירה', 'בידור'], tags_en: ['music', 'song', 'entertainment'] },
    Flame: { icon: Flame, tags_he: ['אש', 'נר', 'נרות שבת', 'חם'], tags_en: ['flame', 'fire', 'candle', 'hot'] },

    // Clothing
    Shirt: { icon: Shirt, tags_he: ['בגדים', 'ביגוד', 'חולצה'], tags_en: ['clothing', 'apparel', 'shirt', 'fashion'] },
    Glasses: { icon: Glasses, tags_he: ['משקפיים', 'ראייה', 'אופנה'], tags_en: ['glasses', 'eyewear', 'vision', 'fashion'] },

    // Electronics / tech
    Laptop: { icon: Laptop, tags_he: ['מחשב נייד', 'מחשב', 'טכנולוגיה'], tags_en: ['laptop', 'computer', 'tech'] },
    Smartphone: { icon: Smartphone, tags_he: ['טלפון', 'סמארטפון', 'נייד'], tags_en: ['phone', 'smartphone', 'mobile'] },
    Tv: { icon: Tv, tags_he: ['טלוויזיה', 'מסך', 'בידור'], tags_en: ['tv', 'television', 'screen', 'entertainment'] },
    Headphones: { icon: Headphones, tags_he: ['אוזניות', 'מוזיקה', 'שמע'], tags_en: ['headphones', 'audio', 'music'] },
    Camera: { icon: Camera, tags_he: ['מצלמה', 'צילום', 'תמונות'], tags_en: ['camera', 'photography', 'photos'] },
    Battery: { icon: Battery, tags_he: ['סוללה', 'טעינה', 'אנרגיה'], tags_en: ['battery', 'charging', 'power'] },
    Wifi: { icon: Wifi, tags_he: ['אינטרנט', 'רשת', 'תקשורת'], tags_en: ['wifi', 'internet', 'network'] },
    Router: { icon: Router, tags_he: ['ראוטר', 'רשת', 'אינטרנט'], tags_en: ['router', 'network', 'internet'] },
    HardDrive: { icon: HardDrive, tags_he: ['אחסון', 'זיכרון', 'מחשב'], tags_en: ['storage', 'drive', 'computer'] },
    Keyboard: { icon: Keyboard, tags_he: ['מקלדת', 'מחשב'], tags_en: ['keyboard', 'computer'] },
    Mouse: { icon: Mouse, tags_he: ['עכבר', 'מחשב'], tags_en: ['mouse', 'computer'] },

    // Tools / hardware
    Wrench: { icon: Wrench, tags_he: ['כלים', 'תיקונים', 'מפתח ברגים'], tags_en: ['tools', 'repair', 'wrench', 'maintenance'] },
    Hammer: { icon: Hammer, tags_he: ['פטיש', 'כלים', 'בנייה'], tags_en: ['hammer', 'tools', 'construction'] },
    Cog: { icon: Cog, tags_he: ['הגדרות', 'גלגל שיניים', 'תחזוקה'], tags_en: ['settings', 'gear', 'maintenance', 'mechanical'] },
    Ruler: { icon: Ruler, tags_he: ['סרגל', 'מדידה', 'כלים'], tags_en: ['ruler', 'measuring', 'tools'] },
    Drill: { icon: Drill, tags_he: ['מקדחה', 'כלים', 'תיקונים'], tags_en: ['drill', 'tools', 'repair'] },

    // Health / beauty
    HeartPulse: { icon: HeartPulse, tags_he: ['בריאות', 'רפואה', 'דופק'], tags_en: ['health', 'medical', 'pulse'] },
    Stethoscope: { icon: Stethoscope, tags_he: ['רפואה', 'רופא', 'בריאות'], tags_en: ['medical', 'doctor', 'health'] },
    Pill: { icon: Pill, tags_he: ['תרופה', 'כדור', 'רפואה'], tags_en: ['pill', 'medicine', 'medication'] },
    Bandage: { icon: Bandage, tags_he: ['תחבושת', 'עזרה ראשונה', 'רפואה'], tags_en: ['bandage', 'first aid', 'medical'] },
    Scissors: { icon: Scissors, tags_he: ['מספריים', 'ספר', 'יופי'], tags_en: ['scissors', 'barber', 'beauty'] },
    Heart: { icon: Heart, tags_he: ['לב', 'אהבה', 'בריאות', 'מועדף'], tags_en: ['heart', 'love', 'health', 'favorite'] },

    // Sports / fitness
    Dumbbell: { icon: Dumbbell, tags_he: ['כושר', 'התעמלות', 'ספורט'], tags_en: ['fitness', 'gym', 'sports', 'workout'] },
    Trophy: { icon: Trophy, tags_he: ['גביע', 'ניצחון', 'הישג'], tags_en: ['trophy', 'win', 'achievement'] },
    Volleyball: { icon: Volleyball, tags_he: ['כדורעף', 'ספורט', 'כדור'], tags_en: ['volleyball', 'sports', 'ball'] },

    // Pets / animals
    Dog: { icon: Dog, tags_he: ['כלב', 'חיות מחמד'], tags_en: ['dog', 'pet', 'animal'] },
    Cat: { icon: Cat, tags_he: ['חתול', 'חיות מחמד'], tags_en: ['cat', 'pet', 'animal'] },
    Fish: { icon: Fish, tags_he: ['דג', 'דגים', 'חיות מחמד', 'ים'], tags_en: ['fish', 'pet', 'aquarium'] },
    PawPrint: { icon: PawPrint, tags_he: ['חיות מחמד', 'טביעת רגל'], tags_en: ['pet', 'paw', 'animal'] },
    Bird: { icon: Bird, tags_he: ['ציפור', 'חיות מחמד'], tags_en: ['bird', 'pet', 'animal'] },
    Rabbit: { icon: Rabbit, tags_he: ['ארנב', 'חיות מחמד'], tags_en: ['rabbit', 'pet', 'animal'] },
    Turtle: { icon: Turtle, tags_he: ['צב', 'חיות מחמד'], tags_en: ['turtle', 'pet', 'animal'] },
    Squirrel: { icon: Squirrel, tags_he: ['סנאי', 'חיה'], tags_en: ['squirrel', 'animal'] },
    Snail: { icon: Snail, tags_he: ['חילזון', 'איטי'], tags_en: ['snail', 'slow'] },

    // Books / office
    Book: { icon: Book, tags_he: ['ספר', 'קריאה', 'לימוד'], tags_en: ['book', 'reading', 'study'] },
    BookOpen: { icon: BookOpen, tags_he: ['ספר פתוח', 'לימוד', 'קריאה'], tags_en: ['open book', 'study', 'reading'] },
    Pencil: { icon: Pencil, tags_he: ['עיפרון', 'כתיבה', 'משרד'], tags_en: ['pencil', 'writing', 'office'] },
    Printer: { icon: Printer, tags_he: ['מדפסת', 'משרד', 'הדפסה'], tags_en: ['printer', 'office', 'printing'] },
    Calculator: { icon: Calculator, tags_he: ['מחשבון', 'חשבונאות', 'משרד'], tags_en: ['calculator', 'accounting', 'office'] },
    FolderOpen: { icon: FolderOpen, tags_he: ['תיקייה', 'מסמכים', 'משרד'], tags_en: ['folder', 'documents', 'office'] },
    Mail: { icon: Mail, tags_he: ['דואר', 'מייל', 'הודעה'], tags_en: ['mail', 'email', 'message'] },
    Phone: { icon: Phone, tags_he: ['טלפון', 'שיחה', 'יצירת קשר'], tags_en: ['phone', 'call', 'contact'] },
    MessageCircle: { icon: MessageCircle, tags_he: ['הודעה', 'צ׳אט', 'תקשורת'], tags_en: ['message', 'chat', 'communication'] },
    Briefcase: { icon: Briefcase, tags_he: ['עסקים', 'משרד', 'עבודה'], tags_en: ['business', 'office', 'work'] },

    // Nature / outdoors / weather
    TreePine: { icon: TreePine, tags_he: ['עץ', 'טבע', 'יער'], tags_en: ['tree', 'nature', 'forest'] },
    Flower2: { icon: Flower2, tags_he: ['פרח', 'פרחים', 'טבע'], tags_en: ['flower', 'nature', 'floral'] },
    Leaf: { icon: Leaf, tags_he: ['עלה', 'טבע', 'ירוק', 'אורגני'], tags_en: ['leaf', 'nature', 'green', 'organic'] },
    Sun: { icon: Sun, tags_he: ['שמש', 'קיץ', 'מזג אוויר'], tags_en: ['sun', 'summer', 'weather'] },
    Moon: { icon: Moon, tags_he: ['ירח', 'לילה'], tags_en: ['moon', 'night'] },
    CloudSun: { icon: CloudSun, tags_he: ['מזג אוויר', 'עננים'], tags_en: ['weather', 'clouds', 'partly sunny'] },
    CloudRain: { icon: CloudRain, tags_he: ['גשם', 'מזג אוויר', 'חורף'], tags_en: ['rain', 'weather', 'winter'] },
    Snowflake: { icon: Snowflake, tags_he: ['שלג', 'חורף', 'קור'], tags_en: ['snow', 'winter', 'cold'] },
    Sprout: { icon: Sprout, tags_he: ['נבט', 'צמיחה', 'גינה'], tags_en: ['sprout', 'growth', 'garden'] },
    Trees: { icon: Trees, tags_he: ['עצים', 'יער', 'טבע'], tags_en: ['trees', 'forest', 'nature'] },
    Palmtree: { icon: Palmtree, tags_he: ['דקל', 'חוף', 'קיץ', 'חופשה'], tags_en: ['palm tree', 'beach', 'vacation'] },
    Sunrise: { icon: Sunrise, tags_he: ['זריחה', 'בוקר'], tags_en: ['sunrise', 'morning'] },
    Sunset: { icon: Sunset, tags_he: ['שקיעה', 'ערב'], tags_en: ['sunset', 'evening'] },
    Feather: { icon: Feather, tags_he: ['נוצה', 'קל', 'עדין'], tags_en: ['feather', 'light', 'delicate'] },
    Compass: { icon: Compass, tags_he: ['מצפן', 'כיוון', 'ניווט'], tags_en: ['compass', 'direction', 'navigation'] },
    Globe: { icon: Globe, tags_he: ['גלובוס', 'עולם', 'בינלאומי'], tags_en: ['globe', 'world', 'international'] },
    Map: { icon: Map, tags_he: ['מפה', 'ניווט', 'מיקום'], tags_en: ['map', 'navigation', 'location'] },

    // Generic retail / commerce
    Tag: { icon: Tag, tags_he: ['תג', 'מוצר', 'קטגוריה', 'מחיר'], tags_en: ['tag', 'product', 'category', 'price', 'label'] },
    Package: { icon: Package, tags_he: ['חבילה', 'משלוח', 'מוצר'], tags_en: ['package', 'shipping', 'product', 'box'] },
    ShoppingBag: { icon: ShoppingBag, tags_he: ['שקית קניות', 'קניות', 'חנות'], tags_en: ['shopping bag', 'shopping', 'store'] },
    ShoppingCart: { icon: ShoppingCart, tags_he: ['עגלת קניות', 'קניות', 'חנות'], tags_en: ['shopping cart', 'shopping', 'store'] },
    Store: { icon: Store, tags_he: ['חנות', 'עסק', 'עולם'], tags_en: ['store', 'shop', 'business'] },
    Boxes: { icon: Boxes, tags_he: ['קופסאות', 'מלאי', 'אחסון'], tags_en: ['boxes', 'inventory', 'storage'] },
    Award: { icon: Award, tags_he: ['פרס', 'הישג', 'איכות'], tags_en: ['award', 'achievement', 'quality'] },
    ThumbsUp: { icon: ThumbsUp, tags_he: ['לייק', 'אישור', 'מומלץ'], tags_en: ['like', 'approve', 'recommended'] },
    CheckCircle2: { icon: CheckCircle2, tags_he: ['אישור', 'תקין', 'הושלם'], tags_en: ['confirmed', 'approved', 'complete'] },
    Percent: { icon: Percent, tags_he: ['הנחה', 'אחוז', 'מבצע'], tags_en: ['discount', 'percent', 'sale'] },
    BadgePercent: { icon: BadgePercent, tags_he: ['מבצע', 'הנחה', 'קופון'], tags_en: ['sale', 'discount', 'coupon'] },
    BadgeCheck: { icon: BadgeCheck, tags_he: ['אימות', 'מאושר', 'איכות'], tags_en: ['verified', 'approved', 'quality'] },

    // Insurance / documents / legal / security
    Shield: { icon: Shield, tags_he: ['ביטוח', 'הגנה', 'אבטחה'], tags_en: ['insurance', 'protection', 'security'] },
    ShieldCheck: { icon: ShieldCheck, tags_he: ['ביטוח', 'מאושר', 'הגנה'], tags_en: ['insurance', 'verified', 'protection'] },
    FileText: { icon: FileText, tags_he: ['מסמך', 'טופס', 'חוזה'], tags_en: ['document', 'form', 'contract'] },
    Umbrella: { icon: Umbrella, tags_he: ['ביטוח', 'הגנה', 'גשם'], tags_en: ['insurance', 'protection', 'rain'] },
    Landmark: { icon: Landmark, tags_he: ['בנק', 'מוסד', 'ממשלה'], tags_en: ['bank', 'institution', 'government'] },
    FileCheck: { icon: FileCheck, tags_he: ['מסמך מאושר', 'אישור', 'טופס'], tags_en: ['approved document', 'confirmed', 'form'] },
    Scale: { icon: Scale, tags_he: ['חוק', 'משפט', 'עורך דין'], tags_en: ['legal', 'law', 'lawyer', 'justice'] },
    Gavel: { icon: Gavel, tags_he: ['משפט', 'חוק', 'פסק דין'], tags_en: ['legal', 'law', 'court', 'ruling'] },
    Handshake: { icon: Handshake, tags_he: ['הסכם', 'עסקה', 'שותפות'], tags_en: ['agreement', 'deal', 'partnership'] },
    ClipboardCheck: { icon: ClipboardCheck, tags_he: ['רשימת מטלות', 'אישור', 'בדיקה'], tags_en: ['checklist', 'approved', 'inspection'] },
    Receipt: { icon: Receipt, tags_he: ['קבלה', 'חשבונית', 'תשלום'], tags_en: ['receipt', 'invoice', 'payment'] },
    CreditCard: { icon: CreditCard, tags_he: ['כרטיס אשראי', 'תשלום', 'כספים'], tags_en: ['credit card', 'payment', 'finance'] },
    Banknote: { icon: Banknote, tags_he: ['כסף', 'מזומן', 'תשלום'], tags_en: ['money', 'cash', 'payment'] },
    PiggyBank: { icon: PiggyBank, tags_he: ['חיסכון', 'כספים', 'קופת חיסכון'], tags_en: ['savings', 'finance', 'piggy bank'] },
    Lock: { icon: Lock, tags_he: ['אבטחה', 'נעילה', 'פרטיות'], tags_en: ['security', 'lock', 'privacy'] },
    Cctv: { icon: Cctv, tags_he: ['מצלמות אבטחה', 'אבטחה', 'שמירה'], tags_en: ['security camera', 'surveillance', 'cctv'] },
    Siren: { icon: Siren, tags_he: ['חירום', 'אזעקה', 'ביטחון'], tags_en: ['emergency', 'alarm', 'safety'] },
    AlertTriangle: { icon: AlertTriangle, tags_he: ['אזהרה', 'התראה', 'סיכון'], tags_en: ['warning', 'alert', 'risk'] },

    // Real estate
    Key: { icon: Key, tags_he: ['מפתח', 'נדל"ן', 'דירה'], tags_en: ['key', 'real estate', 'apartment'] },
    KeyRound: { icon: KeyRound, tags_he: ['מפתח', 'גישה', 'נדל"ן'], tags_en: ['key', 'access', 'real estate'] },
    MapPin: { icon: MapPin, tags_he: ['מיקום', 'כתובת', 'נדל"ן'], tags_en: ['location', 'address', 'real estate'] },

    // Art / music / hobbies
    Palette: { icon: Palette, tags_he: ['אומנות', 'צבעים', 'עיצוב'], tags_en: ['art', 'colors', 'design'] },
    Paintbrush: { icon: Paintbrush, tags_he: ['ציור', 'אומנות', 'מברשת'], tags_en: ['painting', 'art', 'brush'] },
    Guitar: { icon: Guitar, tags_he: ['גיטרה', 'מוזיקה', 'כלי נגינה'], tags_en: ['guitar', 'music', 'instrument'] },
    Film: { icon: Film, tags_he: ['סרט', 'קולנוע', 'בידור'], tags_en: ['film', 'movie', 'entertainment'] },
    Clapperboard: { icon: Clapperboard, tags_he: ['הפקה', 'צילום', 'קולנוע'], tags_en: ['production', 'filming', 'movie'] },
    Bell: { icon: Bell, tags_he: ['פעמון', 'התראה', 'עדכון'], tags_en: ['bell', 'notification', 'alert'] },
    BellRing: { icon: BellRing, tags_he: ['פעמון', 'צלצול', 'התראה'], tags_en: ['bell', 'ringing', 'notification'] },
};

export const ICON_OPTIONS = Object.keys(ICON_LIBRARY);

/** Fallback-aware icon lookup. `fallback` must itself be a valid key in ICON_LIBRARY. */
export function getIcon(key?: string | null, fallback: string = 'Tag'): LucideIcon {
    if (key && ICON_LIBRARY[key]) return ICON_LIBRARY[key].icon;
    return (ICON_LIBRARY[fallback] || ICON_LIBRARY.Tag).icon;
}

// Compat wrappers — preserve the two old getters' exact signatures/fallbacks (Tag vs Store) so
// every existing external caller (CategoryBar, GlobalSearch, SiteFooter, ProfileClient, several
// admin pages) needs only an import-path change, not a behavioral one.
export const getCategoryIcon = (icon?: string | null): LucideIcon => getIcon(icon, 'Tag');
export const getVerticalIcon = (icon?: string | null): LucideIcon => getIcon(icon, 'Store');

/** Case-insensitive substring match against an icon's own key plus its Hebrew/English tags. No
 * fuzzy-search dependency — matches this codebase's existing local-list-filter convention. */
export function searchIcons(query: string): string[] {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_OPTIONS;
    return ICON_OPTIONS.filter((key) => {
        const entry = ICON_LIBRARY[key];
        if (key.toLowerCase().includes(q)) return true;
        if (entry.tags_he.some((t) => t.toLowerCase().includes(q))) return true;
        if (entry.tags_en.some((t) => t.toLowerCase().includes(q))) return true;
        return false;
    });
}

/**
 * Ranks icons by how well their tags match the given free text (e.g. a category/world name as
 * the admin types it). Splits `text` into words (whitespace/comma-separated only — a real
 * category/world name is a plain human-typed phrase, not a hyphenated slug, so hyphens are kept
 * attached rather than treated as separators) and scores each icon by counting (word, tag) pairs
 * where either contains the other — this catches Hebrew prefixes like ל/ה via plain substring
 * containment (e.g. the word "לקידוש" contains the tag "קידוש") without needing real
 * morphological analysis. Both the word and the tag must be at least 3 characters to count as a
 * containment match (word.length < 3 pairs still require an exact match) — a 2-letter fragment
 * (e.g. "no") is too likely to appear inside an unrelated longer tag (e.g. "snow") to be a
 * meaningful signal; this was caught by a real false-positive in this function's own test suite,
 * not assumed up front. Only icons with score > 0 are returned, ranked descending; ties keep
 * insertion order for free since Array.prototype.sort is stable in V8/Node.
 */
export function suggestIconsFor(text: string, limit = 6): string[] {
    const words = text.trim().toLowerCase().split(/[\s,،]+/).filter((w) => w.length >= 2);
    if (words.length === 0) return [];
    const scored = ICON_OPTIONS.map((key) => {
        const entry = ICON_LIBRARY[key];
        const tags = [...entry.tags_he, ...entry.tags_en].map((t) => t.toLowerCase());
        let score = 0;
        for (const w of words) {
            for (const t of tags) {
                const isMatch = w === t || (w.length >= 3 && t.length >= 3 && (t.includes(w) || w.includes(t)));
                if (isMatch) score++;
            }
        }
        return { key, score };
    });
    return scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((s) => s.key);
}
