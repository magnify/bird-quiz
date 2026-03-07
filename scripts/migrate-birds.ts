/**
 * Data migration script: Populates Supabase with bird data from the legacy app.
 *
 * Usage:
 *   npx tsx scripts/migrate-birds.ts
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ============================================================
// DATA FROM LEGACY birds.js AND app.js
// ============================================================

interface LegacyBird {
  da: string
  en: string
  sci: string
  cat: string
  common: boolean
}

const BIRDS: LegacyBird[] = [
  // Garden / city birds
  { da: "Solsort", en: "Common Blackbird", sci: "Turdus merula", cat: "standfugl", common: true },
  { da: "Gråspurv", en: "House Sparrow", sci: "Passer domesticus", cat: "standfugl", common: true },
  { da: "Skovspurv", en: "Eurasian Tree Sparrow", sci: "Passer montanus", cat: "standfugl", common: true },
  { da: "Musvit", en: "Great Tit", sci: "Parus major", cat: "standfugl", common: true },
  { da: "Blåmejse", en: "Eurasian Blue Tit", sci: "Cyanistes caeruleus", cat: "standfugl", common: true },
  { da: "Sortmejse", en: "Coal Tit", sci: "Periparus ater", cat: "standfugl", common: true },
  { da: "Topmejse", en: "European Crested Tit", sci: "Lophophanes cristatus", cat: "standfugl", common: false },
  { da: "Halemejse", en: "Long-tailed Tit", sci: "Aegithalos caudatus", cat: "standfugl", common: true },
  { da: "Bogfinke", en: "Common Chaffinch", sci: "Fringilla coelebs", cat: "standfugl", common: true },
  { da: "Grønirisk", en: "European Greenfinch", sci: "Chloris chloris", cat: "standfugl", common: true },
  { da: "Stillits", en: "European Goldfinch", sci: "Carduelis carduelis", cat: "standfugl", common: true },
  { da: "Grønsisken", en: "Eurasian Siskin", sci: "Spinus spinus", cat: "standfugl", common: false },
  { da: "Tornirisk", en: "Common Linnet", sci: "Linaria cannabina", cat: "standfugl", common: false },
  { da: "Dompap", en: "Eurasian Bullfinch", sci: "Pyrrhula pyrrhula", cat: "standfugl", common: false },
  { da: "Kernebider", en: "Hawfinch", sci: "Coccothraustes coccothraustes", cat: "standfugl", common: false },
  { da: "Ringdue", en: "Common Wood Pigeon", sci: "Columba palumbus", cat: "standfugl", common: true },
  { da: "Tyrkerdue", en: "Eurasian Collared Dove", sci: "Streptopelia decaocto", cat: "standfugl", common: true },
  { da: "Husskade", en: "Eurasian Magpie", sci: "Pica pica", cat: "standfugl", common: true },
  { da: "Gråkrage", en: "Hooded Crow", sci: "Corvus cornix", cat: "standfugl", common: true },
  { da: "Sortkrage", en: "Carrion Crow", sci: "Corvus corone", cat: "standfugl", common: false },
  { da: "Råge", en: "Rook", sci: "Corvus frugilegus", cat: "standfugl", common: true },
  { da: "Allike", en: "Western Jackdaw", sci: "Coloeus monedula", cat: "standfugl", common: true },
  { da: "Stær", en: "Common Starling", sci: "Sturnus vulgaris", cat: "standfugl", common: true },
  { da: "Jernspurv", en: "Dunnock", sci: "Prunella modularis", cat: "standfugl", common: true },
  { da: "Gærdesmutte", en: "Eurasian Wren", sci: "Troglodytes troglodytes", cat: "standfugl", common: true },
  { da: "Rødkælk", en: "European Robin", sci: "Erithacus rubecula", cat: "standfugl", common: true },
  // Swans, geese, ducks
  { da: "Knopsvane", en: "Mute Swan", sci: "Cygnus olor", cat: "standfugl", common: true },
  { da: "Sangsvane", en: "Whooper Swan", sci: "Cygnus cygnus", cat: "trækfugl", common: false },
  { da: "Pibesvane", en: "Tundra Swan", sci: "Cygnus columbianus", cat: "trækfugl", common: false },
  { da: "Grågås", en: "Greylag Goose", sci: "Anser anser", cat: "trækfugl", common: true },
  { da: "Bramgås", en: "Barnacle Goose", sci: "Branta leucopsis", cat: "trækfugl", common: false },
  { da: "Canadagås", en: "Canada Goose", sci: "Branta canadensis", cat: "standfugl", common: false },
  { da: "Kortnæbbet gås", en: "Pink-footed Goose", sci: "Anser brachyrhynchus", cat: "trækfugl", common: false },
  { da: "Blisgås", en: "Greater White-fronted Goose", sci: "Anser albifrons", cat: "trækfugl", common: false },
  { da: "Knortegås", en: "Brent Goose", sci: "Branta bernicla", cat: "trækfugl", common: false },
  { da: "Gråand", en: "Mallard", sci: "Anas platyrhynchos", cat: "standfugl", common: true },
  { da: "Krikand", en: "Eurasian Teal", sci: "Anas crecca", cat: "trækfugl", common: true },
  { da: "Pibeand", en: "Eurasian Wigeon", sci: "Mareca penelope", cat: "trækfugl", common: false },
  { da: "Spidsand", en: "Northern Pintail", sci: "Anas acuta", cat: "trækfugl", common: false },
  { da: "Skeand", en: "Northern Shoveler", sci: "Spatula clypeata", cat: "trækfugl", common: false },
  { da: "Troldand", en: "Tufted Duck", sci: "Aythya fuligula", cat: "standfugl", common: true },
  { da: "Taffeland", en: "Common Pochard", sci: "Aythya ferina", cat: "trækfugl", common: false },
  { da: "Hvinand", en: "Common Goldeneye", sci: "Bucephala clangula", cat: "trækfugl", common: false },
  { da: "Ederfugl", en: "Common Eider", sci: "Somateria mollissima", cat: "standfugl", common: true },
  { da: "Sortand", en: "Common Scoter", sci: "Melanitta nigra", cat: "trækfugl", common: false },
  { da: "Fløjlsand", en: "Velvet Scoter", sci: "Melanitta fusca", cat: "trækfugl", common: false },
  { da: "Havlit", en: "Long-tailed Duck", sci: "Clangula hyemalis", cat: "trækfugl", common: false },
  { da: "Bjergand", en: "Greater Scaup", sci: "Aythya marila", cat: "trækfugl", common: false },
  { da: "Toppet skallesluger", en: "Red-breasted Merganser", sci: "Mergus serrator", cat: "standfugl", common: false },
  { da: "Stor skallesluger", en: "Common Merganser", sci: "Mergus merganser", cat: "trækfugl", common: false },
  { da: "Lille skallesluger", en: "Smew", sci: "Mergellus albellus", cat: "trækfugl", common: false },
  { da: "Atlingand", en: "Garganey", sci: "Spatula querquedula", cat: "trækfugl", common: false },
  { da: "Gravand", en: "Common Shelduck", sci: "Tadorna tadorna", cat: "trækfugl", common: true },
  // Rails, grebes, herons, cormorants
  { da: "Blishøne", en: "Eurasian Coot", sci: "Fulica atra", cat: "standfugl", common: true },
  { da: "Grønbenet rørhøne", en: "Common Moorhen", sci: "Gallinula chloropus", cat: "standfugl", common: true },
  { da: "Vandrikse", en: "Water Rail", sci: "Rallus aquaticus", cat: "standfugl", common: false },
  { da: "Toppet lappedykker", en: "Great Crested Grebe", sci: "Podiceps cristatus", cat: "standfugl", common: true },
  { da: "Lille lappedykker", en: "Little Grebe", sci: "Tachybaptus ruficollis", cat: "standfugl", common: false },
  { da: "Gråstrubet lappedykker", en: "Red-necked Grebe", sci: "Podiceps grisegena", cat: "trækfugl", common: false },
  { da: "Sorthalset lappedykker", en: "Black-necked Grebe", sci: "Podiceps nigricollis", cat: "trækfugl", common: false },
  { da: "Fiskehejre", en: "Grey Heron", sci: "Ardea cinerea", cat: "standfugl", common: true },
  { da: "Skarv", en: "Great Cormorant", sci: "Phalacrocorax carbo", cat: "standfugl", common: true },
  { da: "Rørdrum", en: "Eurasian Bittern", sci: "Botaurus stellaris", cat: "standfugl", common: false },
  // Raptors
  { da: "Musvåge", en: "Common Buzzard", sci: "Buteo buteo", cat: "standfugl", common: true },
  { da: "Fjeldvåge", en: "Rough-legged Buzzard", sci: "Buteo lagopus", cat: "trækfugl", common: false },
  { da: "Spurvehøg", en: "Eurasian Sparrowhawk", sci: "Accipiter nisus", cat: "standfugl", common: true },
  { da: "Duehøg", en: "Northern Goshawk", sci: "Accipiter gentilis", cat: "standfugl", common: false },
  { da: "Tårnfalk", en: "Common Kestrel", sci: "Falco tinnunculus", cat: "standfugl", common: true },
  { da: "Dværgfalk", en: "Merlin", sci: "Falco columbarius", cat: "trækfugl", common: false },
  { da: "Vandrefalk", en: "Peregrine Falcon", sci: "Falco peregrinus", cat: "standfugl", common: false },
  { da: "Lærkefalk", en: "Eurasian Hobby", sci: "Falco subbuteo", cat: "trækfugl", common: false },
  { da: "Havørn", en: "White-tailed Eagle", sci: "Haliaeetus albicilla", cat: "standfugl", common: false },
  { da: "Rød glente", en: "Red Kite", sci: "Milvus milvus", cat: "standfugl", common: false },
  { da: "Sort glente", en: "Black Kite", sci: "Milvus migrans", cat: "trækfugl", common: false },
  { da: "Rørhøg", en: "Western Marsh Harrier", sci: "Circus aeruginosus", cat: "trækfugl", common: false },
  { da: "Blå kærhøg", en: "Hen Harrier", sci: "Circus cyaneus", cat: "trækfugl", common: false },
  { da: "Hvepsevåge", en: "European Honey Buzzard", sci: "Pernis apivorus", cat: "trækfugl", common: false },
  { da: "Fiskeørn", en: "Osprey", sci: "Pandion haliaetus", cat: "trækfugl", common: false },
  // Owls
  { da: "Slørugle", en: "Barn Owl", sci: "Tyto alba", cat: "standfugl", common: false },
  { da: "Natugle", en: "Tawny Owl", sci: "Strix aluco", cat: "standfugl", common: false },
  { da: "Skovhornugle", en: "Long-eared Owl", sci: "Asio otus", cat: "standfugl", common: false },
  { da: "Mosehornugle", en: "Short-eared Owl", sci: "Asio flammeus", cat: "trækfugl", common: false },
  // Gulls, terns, auks
  { da: "Sølvmåge", en: "Herring Gull", sci: "Larus argentatus", cat: "standfugl", common: true },
  { da: "Stormmåge", en: "Common Gull", sci: "Larus canus", cat: "standfugl", common: true },
  { da: "Hættemåge", en: "Black-headed Gull", sci: "Chroicocephalus ridibundus", cat: "standfugl", common: true },
  { da: "Svartbag", en: "Great Black-backed Gull", sci: "Larus marinus", cat: "standfugl", common: true },
  { da: "Sildemåge", en: "Lesser Black-backed Gull", sci: "Larus fuscus", cat: "trækfugl", common: false },
  { da: "Ride", en: "Black-legged Kittiwake", sci: "Rissa tridactyla", cat: "trækfugl", common: false },
  { da: "Dværgmåge", en: "Little Gull", sci: "Hydrocoloeus minutus", cat: "trækfugl", common: false },
  { da: "Sorthovedet måge", en: "Mediterranean Gull", sci: "Ichthyaetus melanocephalus", cat: "sjælden gæst", common: false },
  { da: "Fjordterne", en: "Common Tern", sci: "Sterna hirundo", cat: "trækfugl", common: true },
  { da: "Havterne", en: "Arctic Tern", sci: "Sterna paradisaea", cat: "trækfugl", common: false },
  { da: "Dværgterne", en: "Little Tern", sci: "Sternula albifrons", cat: "trækfugl", common: false },
  { da: "Splitterne", en: "Sandwich Tern", sci: "Thalasseus sandvicensis", cat: "trækfugl", common: false },
  { da: "Rovterne", en: "Caspian Tern", sci: "Hydroprogne caspia", cat: "trækfugl", common: false },
  { da: "Sortterne", en: "Black Tern", sci: "Chlidonias niger", cat: "trækfugl", common: false },
  { da: "Lomvie", en: "Common Murre", sci: "Uria aalge", cat: "standfugl", common: false },
  { da: "Alk", en: "Razorbill", sci: "Alca torda", cat: "standfugl", common: false },
  { da: "Søkonge", en: "Little Auk", sci: "Alle alle", cat: "trækfugl", common: false },
  { da: "Lunde", en: "Atlantic Puffin", sci: "Fratercula arctica", cat: "sjælden gæst", common: false },
  { da: "Tejst", en: "Black Guillemot", sci: "Cepphus grylle", cat: "standfugl", common: false },
  { da: "Sule", en: "Northern Gannet", sci: "Morus bassanus", cat: "trækfugl", common: false },
  { da: "Mallemuk", en: "Northern Fulmar", sci: "Fulmarus glacialis", cat: "trækfugl", common: false },
  { da: "Topskarv", en: "European Shag", sci: "Gulosus aristotelis", cat: "sjælden gæst", common: false },
  // Waders
  { da: "Strandskade", en: "Eurasian Oystercatcher", sci: "Haematopus ostralegus", cat: "trækfugl", common: true },
  { da: "Vibe", en: "Northern Lapwing", sci: "Vanellus vanellus", cat: "trækfugl", common: true },
  { da: "Rødben", en: "Common Redshank", sci: "Tringa totanus", cat: "trækfugl", common: true },
  { da: "Hvidklire", en: "Common Greenshank", sci: "Tringa nebularia", cat: "trækfugl", common: false },
  { da: "Svaleklire", en: "Green Sandpiper", sci: "Tringa ochropus", cat: "trækfugl", common: false },
  { da: "Mudderklire", en: "Wood Sandpiper", sci: "Tringa glareola", cat: "trækfugl", common: false },
  { da: "Tinksmed", en: "Common Sandpiper", sci: "Actitis hypoleucos", cat: "trækfugl", common: false },
  { da: "Stor regnspove", en: "Eurasian Curlew", sci: "Numenius arquata", cat: "trækfugl", common: true },
  { da: "Lille regnspove", en: "Whimbrel", sci: "Numenius phaeopus", cat: "trækfugl", common: false },
  { da: "Lille kobbersneppe", en: "Bar-tailed Godwit", sci: "Limosa lapponica", cat: "trækfugl", common: false },
  { da: "Stor kobbersneppe", en: "Black-tailed Godwit", sci: "Limosa limosa", cat: "trækfugl", common: false },
  { da: "Klyde", en: "Pied Avocet", sci: "Recurvirostra avosetta", cat: "trækfugl", common: false },
  { da: "Brushane", en: "Ruff", sci: "Calidris pugnax", cat: "trækfugl", common: false },
  { da: "Almindelig ryle", en: "Dunlin", sci: "Calidris alpina", cat: "trækfugl", common: false },
  { da: "Sandløber", en: "Sanderling", sci: "Calidris alba", cat: "trækfugl", common: false },
  { da: "Islandsk ryle", en: "Red Knot", sci: "Calidris canutus", cat: "trækfugl", common: false },
  { da: "Sortgrå ryle", en: "Purple Sandpiper", sci: "Calidris maritima", cat: "trækfugl", common: false },
  { da: "Dværgryle", en: "Little Stint", sci: "Calidris minuta", cat: "trækfugl", common: false },
  { da: "Dobbeltbekkasin", en: "Common Snipe", sci: "Gallinago gallinago", cat: "trækfugl", common: false },
  { da: "Enkeltbekkasin", en: "Jack Snipe", sci: "Lymnocryptes minimus", cat: "trækfugl", common: false },
  { da: "Skovsneppe", en: "Eurasian Woodcock", sci: "Scolopax rusticola", cat: "trækfugl", common: false },
  { da: "Stor præstekrave", en: "Common Ringed Plover", sci: "Charadrius hiaticula", cat: "trækfugl", common: false },
  { da: "Lille præstekrave", en: "Little Ringed Plover", sci: "Charadrius dubius", cat: "trækfugl", common: false },
  { da: "Hjejle", en: "European Golden Plover", sci: "Pluvialis apricaria", cat: "trækfugl", common: false },
  { da: "Strandhjejle", en: "Grey Plover", sci: "Pluvialis squatarola", cat: "trækfugl", common: false },
  { da: "Stenvenderen", en: "Ruddy Turnstone", sci: "Arenaria interpres", cat: "trækfugl", common: false },
  { da: "Odinshane", en: "Red-necked Phalarope", sci: "Phalaropus lobatus", cat: "sjælden gæst", common: false },
  { da: "Thorshane", en: "Red Phalarope", sci: "Phalaropus fulicarius", cat: "sjælden gæst", common: false },
  { da: "Stylteløber", en: "Black-winged Stilt", sci: "Himantopus himantopus", cat: "sjælden gæst", common: false },
  // Forest birds
  { da: "Stor flagspætte", en: "Great Spotted Woodpecker", sci: "Dendrocopos major", cat: "standfugl", common: true },
  { da: "Lille flagspætte", en: "Lesser Spotted Woodpecker", sci: "Dryobates minor", cat: "standfugl", common: false },
  { da: "Grønspætte", en: "European Green Woodpecker", sci: "Picus viridis", cat: "standfugl", common: false },
  { da: "Sortspætte", en: "Black Woodpecker", sci: "Dryocopus martius", cat: "standfugl", common: false },
  { da: "Skovdue", en: "Stock Dove", sci: "Columba oenas", cat: "standfugl", common: false },
  { da: "Spætmejse", en: "Eurasian Nuthatch", sci: "Sitta europaea", cat: "standfugl", common: true },
  { da: "Træløber", en: "Eurasian Treecreeper", sci: "Certhia familiaris", cat: "standfugl", common: false },
  { da: "Korttået træløber", en: "Short-toed Treecreeper", sci: "Certhia brachydactyla", cat: "standfugl", common: false },
  { da: "Ravn", en: "Common Raven", sci: "Corvus corax", cat: "standfugl", common: false },
  { da: "Skovskade", en: "Eurasian Jay", sci: "Garrulus glandarius", cat: "standfugl", common: true },
  { da: "Sangdrossel", en: "Song Thrush", sci: "Turdus philomelos", cat: "trækfugl", common: true },
  { da: "Misteldrossel", en: "Mistle Thrush", sci: "Turdus viscivorus", cat: "standfugl", common: false },
  { da: "Vindrossel", en: "Redwing", sci: "Turdus iliacus", cat: "trækfugl", common: false },
  { da: "Sjagger", en: "Fieldfare", sci: "Turdus pilaris", cat: "standfugl", common: true },
  { da: "Fuglekonge", en: "Goldcrest", sci: "Regulus regulus", cat: "standfugl", common: true },
  { da: "Rødtoppet fuglekonge", en: "Firecrest", sci: "Regulus ignicapilla", cat: "trækfugl", common: false },
  // Migratory songbirds and swallows
  { da: "Gøg", en: "Common Cuckoo", sci: "Cuculus canorus", cat: "trækfugl", common: true },
  { da: "Landsvale", en: "Barn Swallow", sci: "Hirundo rustica", cat: "trækfugl", common: true },
  { da: "Bysvale", en: "Common House Martin", sci: "Delichon urbicum", cat: "trækfugl", common: true },
  { da: "Digesvale", en: "Sand Martin", sci: "Riparia riparia", cat: "trækfugl", common: false },
  { da: "Mursejler", en: "Common Swift", sci: "Apus apus", cat: "trækfugl", common: true },
  { da: "Hvid vipstjert", en: "White Wagtail", sci: "Motacilla alba", cat: "trækfugl", common: true },
  { da: "Gul vipstjert", en: "Western Yellow Wagtail", sci: "Motacilla flava", cat: "trækfugl", common: false },
  { da: "Bjergvipstjert", en: "Grey Wagtail", sci: "Motacilla cinerea", cat: "standfugl", common: false },
  { da: "Skovpiber", en: "Tree Pipit", sci: "Anthus trivialis", cat: "trækfugl", common: false },
  { da: "Engpiber", en: "Meadow Pipit", sci: "Anthus pratensis", cat: "trækfugl", common: true },
  { da: "Skærpiber", en: "Rock Pipit", sci: "Anthus petrosus", cat: "standfugl", common: false },
  { da: "Sanglærke", en: "Eurasian Skylark", sci: "Alauda arvensis", cat: "trækfugl", common: true },
  { da: "Hedelærke", en: "Woodlark", sci: "Lullula arborea", cat: "trækfugl", common: false },
  { da: "Toplærke", en: "Crested Lark", sci: "Galerida cristata", cat: "standfugl", common: false },
  { da: "Rødrygget tornskade", en: "Red-backed Shrike", sci: "Lanius collurio", cat: "trækfugl", common: false },
  { da: "Stor tornskade", en: "Great Grey Shrike", sci: "Lanius excubitor", cat: "trækfugl", common: false },
  { da: "Broget fluesnapper", en: "European Pied Flycatcher", sci: "Ficedula hypoleuca", cat: "trækfugl", common: false },
  { da: "Lille fluesnapper", en: "Red-breasted Flycatcher", sci: "Ficedula parva", cat: "trækfugl", common: false },
  { da: "Grå fluesnapper", en: "Spotted Flycatcher", sci: "Muscicapa striata", cat: "trækfugl", common: false },
  { da: "Løvsanger", en: "Willow Warbler", sci: "Phylloscopus trochilus", cat: "trækfugl", common: true },
  { da: "Gransanger", en: "Common Chiffchaff", sci: "Phylloscopus collybita", cat: "trækfugl", common: true },
  { da: "Skovsanger", en: "Wood Warbler", sci: "Phylloscopus sibilatrix", cat: "trækfugl", common: false },
  { da: "Munk", en: "Eurasian Blackcap", sci: "Sylvia atricapilla", cat: "trækfugl", common: true },
  { da: "Havesanger", en: "Garden Warbler", sci: "Sylvia borin", cat: "trækfugl", common: false },
  { da: "Tornsanger", en: "Common Whitethroat", sci: "Curruca communis", cat: "trækfugl", common: true },
  { da: "Gærdesanger", en: "Lesser Whitethroat", sci: "Curruca curruca", cat: "trækfugl", common: false },
  { da: "Rørsanger", en: "Eurasian Reed Warbler", sci: "Acrocephalus scirpaceus", cat: "trækfugl", common: false },
  { da: "Kærsanger", en: "Marsh Warbler", sci: "Acrocephalus palustris", cat: "trækfugl", common: false },
  { da: "Sivsanger", en: "Sedge Warbler", sci: "Acrocephalus schoenobaenus", cat: "trækfugl", common: false },
  { da: "Drosselrørsanger", en: "Great Reed Warbler", sci: "Acrocephalus arundinaceus", cat: "trækfugl", common: false },
  { da: "Gulbug", en: "Icterine Warbler", sci: "Hippolais icterina", cat: "trækfugl", common: false },
  { da: "Nattergal", en: "Thrush Nightingale", sci: "Luscinia luscinia", cat: "trækfugl", common: false },
  { da: "Rødstjert", en: "Common Redstart", sci: "Phoenicurus phoenicurus", cat: "trækfugl", common: false },
  { da: "Husrødstjert", en: "Black Redstart", sci: "Phoenicurus ochruros", cat: "trækfugl", common: false },
  { da: "Bynkefugl", en: "European Stonechat", sci: "Saxicola rubicola", cat: "trækfugl", common: false },
  { da: "Stenpikker", en: "Northern Wheatear", sci: "Oenanthe oenanthe", cat: "trækfugl", common: false },
  // Large wading / wetland birds
  { da: "Hvid stork", en: "White Stork", sci: "Ciconia ciconia", cat: "trækfugl", common: false },
  { da: "Trane", en: "Common Crane", sci: "Grus grus", cat: "trækfugl", common: false },
  { da: "Isfugl", en: "Common Kingfisher", sci: "Alcedo atthis", cat: "standfugl", common: false },
  { da: "Vendehals", en: "Eurasian Wryneck", sci: "Jynx torquilla", cat: "trækfugl", common: false },
  { da: "Natravn", en: "European Nightjar", sci: "Caprimulgus europaeus", cat: "trækfugl", common: false },
  { da: "Vandstær", en: "White-throated Dipper", sci: "Cinclus cinclus", cat: "standfugl", common: false },
  { da: "Skægmejse", en: "Bearded Reedling", sci: "Panurus biarmicus", cat: "standfugl", common: false },
  { da: "Pungmejse", en: "Eurasian Penduline Tit", sci: "Remiz pendulinus", cat: "trækfugl", common: false },
  { da: "Skestork", en: "Eurasian Spoonbill", sci: "Platalea leucorodia", cat: "sjælden gæst", common: false },
  { da: "Lille sølvhejre", en: "Little Egret", sci: "Egretta garzetta", cat: "sjælden gæst", common: false },
  { da: "Stor sølvhejre", en: "Great Egret", sci: "Ardea alba", cat: "sjælden gæst", common: false },
  // Farmland / open country
  { da: "Fasan", en: "Common Pheasant", sci: "Phasianus colchicus", cat: "standfugl", common: true },
  { da: "Agerhøne", en: "Grey Partridge", sci: "Perdix perdix", cat: "standfugl", common: false },
  { da: "Vagtel", en: "Common Quail", sci: "Coturnix coturnix", cat: "trækfugl", common: false },
  { da: "Gulspurv", en: "Yellowhammer", sci: "Emberiza citrinella", cat: "standfugl", common: true },
  { da: "Bomlærke", en: "Corn Bunting", sci: "Emberiza calandra", cat: "standfugl", common: false },
  { da: "Rørspurv", en: "Common Reed Bunting", sci: "Emberiza schoeniclus", cat: "standfugl", common: false },
  { da: "Snespurv", en: "Snow Bunting", sci: "Plectrophenax nivalis", cat: "trækfugl", common: false },
  // Rare visitors / uncommon
  { da: "Silkehale", en: "Bohemian Waxwing", sci: "Bombycilla garrulus", cat: "sjælden gæst", common: false },
  { da: "Hvidvinget korsnæb", en: "Two-barred Crossbill", sci: "Loxia leucoptera", cat: "sjælden gæst", common: false },
  { da: "Lille korsnæb", en: "Red Crossbill", sci: "Loxia curvirostra", cat: "sjælden gæst", common: false },
  { da: "Stor korsnæb", en: "Parrot Crossbill", sci: "Loxia pytyopsittacus", cat: "sjælden gæst", common: false },
  { da: "Nøddekrige", en: "Spotted Nutcracker", sci: "Nucifraga caryocatactes", cat: "sjælden gæst", common: false },
  { da: "Rosenstær", en: "Rosy Starling", sci: "Pastor roseus", cat: "sjælden gæst", common: false },
  { da: "Pirol", en: "Eurasian Golden Oriole", sci: "Oriolus oriolus", cat: "sjælden gæst", common: false },
  { da: "Kongeørn", en: "Golden Eagle", sci: "Aquila chrysaetos", cat: "sjælden gæst", common: false },
  { da: "Biæder", en: "European Bee-eater", sci: "Merops apiaster", cat: "sjælden gæst", common: false },
  { da: "Hærfugl", en: "Eurasian Hoopoe", sci: "Upupa epops", cat: "sjælden gæst", common: false },
  { da: "Ellekrage", en: "European Roller", sci: "Coracias garrulus", cat: "sjælden gæst", common: false },
  { da: "Kvækerfinke", en: "Brambling", sci: "Fringilla montifringilla", cat: "trækfugl", common: false },
  { da: "Sort stork", en: "Black Stork", sci: "Ciconia nigra", cat: "sjælden gæst", common: false },
  { da: "Hvidbrystet præstekrave", en: "Kentish Plover", sci: "Anarhynchus alexandrinus", cat: "sjælden gæst", common: false },
  { da: "Alpejernspurv", en: "Alpine Accentor", sci: "Prunella collaris", cat: "sjælden gæst", common: false },
  { da: "Sabinemåge", en: "Sabine's Gull", sci: "Xema sabini", cat: "sjælden gæst", common: false },
  { da: "Steppehøg", en: "Pallid Harrier", sci: "Circus macrourus", cat: "sjælden gæst", common: false },
  { da: "Aftenfalk", en: "Red-footed Falcon", sci: "Falco vespertinus", cat: "sjælden gæst", common: false },
]

const EASY_BIRDS = new Set([
  'Turdus merula', 'Passer domesticus', 'Parus major', 'Cyanistes caeruleus',
  'Erithacus rubecula', 'Columba palumbus', 'Pica pica', 'Corvus cornix',
  'Cygnus olor', 'Anas platyrhynchos', 'Ardea cinerea', 'Phalacrocorax carbo',
  'Buteo buteo', 'Larus argentatus', 'Chroicocephalus ridibundus',
  'Haematopus ostralegus', 'Vanellus vanellus', 'Dendrocopos major',
  'Sturnus vulgaris', 'Hirundo rustica', 'Phasianus colchicus',
  'Anser anser', 'Somateria mollissima', 'Fulica atra', 'Fringilla coelebs',
])

const SIMILARITY_GROUPS: Record<string, { name_da: string; name_en: string; members: string[] }> = {
  tits:        { name_da: 'Mejser', name_en: 'Tits', members: ['Parus major', 'Cyanistes caeruleus', 'Periparus ater', 'Lophophanes cristatus', 'Aegithalos caudatus', 'Sitta europaea'] },
  sparrows:    { name_da: 'Spurve', name_en: 'Sparrows', members: ['Passer domesticus', 'Passer montanus', 'Prunella modularis', 'Emberiza citrinella', 'Emberiza calandra', 'Emberiza schoeniclus', 'Fringilla coelebs', 'Fringilla montifringilla'] },
  finches:     { name_da: 'Finker', name_en: 'Finches', members: ['Chloris chloris', 'Carduelis carduelis', 'Spinus spinus', 'Linaria cannabina', 'Pyrrhula pyrrhula', 'Coccothraustes coccothraustes', 'Loxia curvirostra', 'Loxia leucoptera', 'Loxia pytyopsittacus'] },
  thrushes:    { name_da: 'Drosler', name_en: 'Thrushes', members: ['Turdus merula', 'Turdus philomelos', 'Turdus viscivorus', 'Turdus iliacus', 'Turdus pilaris', 'Sturnus vulgaris'] },
  warblers:    { name_da: 'Sangere', name_en: 'Warblers', members: ['Phylloscopus trochilus', 'Phylloscopus collybita', 'Phylloscopus sibilatrix', 'Sylvia atricapilla', 'Sylvia borin', 'Curruca communis', 'Curruca curruca', 'Acrocephalus scirpaceus', 'Acrocephalus palustris', 'Acrocephalus schoenobaenus', 'Hippolais icterina', 'Regulus regulus', 'Regulus ignicapilla'] },
  corvids:     { name_da: 'Kragefugle', name_en: 'Corvids', members: ['Pica pica', 'Corvus cornix', 'Corvus corone', 'Corvus frugilegus', 'Coloeus monedula', 'Corvus corax', 'Garrulus glandarius', 'Nucifraga caryocatactes'] },
  raptors:     { name_da: 'Rovfugle', name_en: 'Raptors', members: ['Buteo buteo', 'Buteo lagopus', 'Accipiter nisus', 'Accipiter gentilis', 'Milvus milvus', 'Milvus migrans', 'Circus aeruginosus', 'Circus cyaneus', 'Circus macrourus', 'Pernis apivorus', 'Haliaeetus albicilla', 'Pandion haliaetus', 'Aquila chrysaetos'] },
  falcons:     { name_da: 'Falke', name_en: 'Falcons', members: ['Falco tinnunculus', 'Falco columbarius', 'Falco peregrinus', 'Falco subbuteo', 'Falco vespertinus'] },
  owls:        { name_da: 'Ugler', name_en: 'Owls', members: ['Tyto alba', 'Strix aluco', 'Asio otus', 'Asio flammeus'] },
  gulls:       { name_da: 'Måger', name_en: 'Gulls', members: ['Larus argentatus', 'Larus canus', 'Chroicocephalus ridibundus', 'Larus marinus', 'Larus fuscus', 'Rissa tridactyla', 'Hydrocoloeus minutus', 'Ichthyaetus melanocephalus', 'Xema sabini'] },
  terns:       { name_da: 'Terner', name_en: 'Terns', members: ['Sterna hirundo', 'Sterna paradisaea', 'Sternula albifrons', 'Thalasseus sandvicensis', 'Hydroprogne caspia', 'Chlidonias niger'] },
  ducks:       { name_da: 'Ænder', name_en: 'Ducks', members: ['Anas platyrhynchos', 'Anas crecca', 'Mareca penelope', 'Anas acuta', 'Spatula clypeata', 'Spatula querquedula', 'Aythya fuligula', 'Aythya ferina', 'Aythya marila', 'Bucephala clangula'] },
  seaducks:    { name_da: 'Havænder', name_en: 'Sea ducks', members: ['Somateria mollissima', 'Melanitta nigra', 'Melanitta fusca', 'Clangula hyemalis', 'Mergus serrator', 'Mergus merganser', 'Mergellus albellus'] },
  geese:       { name_da: 'Gæs', name_en: 'Geese', members: ['Anser anser', 'Branta leucopsis', 'Branta canadensis', 'Anser brachyrhynchus', 'Anser albifrons', 'Branta bernicla'] },
  swans:       { name_da: 'Svaner', name_en: 'Swans', members: ['Cygnus olor', 'Cygnus cygnus', 'Cygnus columbianus'] },
  waders:      { name_da: 'Vadefugle', name_en: 'Waders', members: ['Haematopus ostralegus', 'Vanellus vanellus', 'Tringa totanus', 'Tringa nebularia', 'Tringa ochropus', 'Tringa glareola', 'Actitis hypoleucos', 'Numenius arquata', 'Numenius phaeopus', 'Limosa lapponica', 'Limosa limosa', 'Recurvirostra avosetta'] },
  sandpipers:  { name_da: 'Ryler', name_en: 'Sandpipers', members: ['Calidris pugnax', 'Calidris alpina', 'Calidris alba', 'Calidris canutus', 'Calidris maritima', 'Calidris minuta', 'Gallinago gallinago', 'Lymnocryptes minimus', 'Scolopax rusticola'] },
  plovers:     { name_da: 'Præstekraver', name_en: 'Plovers', members: ['Charadrius hiaticula', 'Charadrius dubius', 'Pluvialis apricaria', 'Pluvialis squatarola', 'Arenaria interpres', 'Anarhynchus alexandrinus'] },
  grebes:      { name_da: 'Lappedykkere', name_en: 'Grebes', members: ['Podiceps cristatus', 'Tachybaptus ruficollis', 'Podiceps grisegena', 'Podiceps nigricollis'] },
  swallows:    { name_da: 'Svaler', name_en: 'Swallows', members: ['Hirundo rustica', 'Delichon urbicum', 'Riparia riparia', 'Apus apus'] },
  wagtails:    { name_da: 'Vipstjerter', name_en: 'Wagtails', members: ['Motacilla alba', 'Motacilla flava', 'Motacilla cinerea', 'Anthus trivialis', 'Anthus pratensis', 'Anthus petrosus'] },
  woodpeckers: { name_da: 'Spætter', name_en: 'Woodpeckers', members: ['Dendrocopos major', 'Dryobates minor', 'Picus viridis', 'Dryocopus martius', 'Jynx torquilla'] },
  pigeons:     { name_da: 'Duer', name_en: 'Pigeons', members: ['Columba palumbus', 'Streptopelia decaocto', 'Columba oenas'] },
  flycatchers: { name_da: 'Fluesnappere', name_en: 'Flycatchers', members: ['Ficedula hypoleuca', 'Ficedula parva', 'Muscicapa striata', 'Erithacus rubecula', 'Phoenicurus phoenicurus', 'Phoenicurus ochruros', 'Saxicola rubicola', 'Oenanthe oenanthe', 'Luscinia luscinia'] },
  herons:      { name_da: 'Hejrer', name_en: 'Herons', members: ['Ardea cinerea', 'Botaurus stellaris', 'Ardea alba', 'Egretta garzetta', 'Platalea leucorodia', 'Ciconia ciconia', 'Ciconia nigra'] },
  auks:        { name_da: 'Alkefugle', name_en: 'Auks', members: ['Uria aalge', 'Alca torda', 'Alle alle', 'Fratercula arctica', 'Cepphus grylle'] },
  gamebirds:   { name_da: 'Hønsefugle', name_en: 'Game birds', members: ['Phasianus colchicus', 'Perdix perdix', 'Coturnix coturnix'] },
}

const IMAGE_OVERRIDES: Record<string, string> = {
  'Coccothraustes coccothraustes': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Coccothraustes_coccothraustes_-_01.jpg/800px-Coccothraustes_coccothraustes_-_01.jpg',
  'Sturnus vulgaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Sturnus_vulgaris_-California-8.jpg/800px-Sturnus_vulgaris_-California-8.jpg',
  'Spinus spinus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Erlenzeisig_Spinus_spinus_male.jpg/800px-Erlenzeisig_Spinus_spinus_male.jpg',
  'Branta leucopsis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Barnacle_goose_%28Branta_leucopsis%29.jpg/800px-Barnacle_goose_%28Branta_leucopsis%29.jpg',
  'Mergellus albellus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Male_of_Mergellus_albellus_%28male_s2%29.jpg/800px-Male_of_Mergellus_albellus_%28male_s2%29.jpg',
  'Botaurus stellaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Bittern_-_Botaurus_stellaris.jpg/800px-Bittern_-_Botaurus_stellaris.jpg',
  'Ardea cinerea': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Ardea_cinerea_Luc_Viatour.jpg/800px-Ardea_cinerea_Luc_Viatour.jpg',
  'Buteo buteo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Steppe_buzzard_%28Buteo_buteo_vulpinus%29.jpg/800px-Steppe_buzzard_%28Buteo_buteo_vulpinus%29.jpg',
  'Accipiter nisus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Eurasian_sparrowhawk_%28Accipiter_nisus_nisus%29_male.jpg/800px-Eurasian_sparrowhawk_%28Accipiter_nisus_nisus%29_male.jpg',
  'Buteo lagopus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Buteo_lagopus_29283.JPG/800px-Buteo_lagopus_29283.JPG',
  'Circus aeruginosus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Marsh_harrier_%28Circus_aeruginosus%29_male_Danube_delta.jpg/800px-Marsh_harrier_%28Circus_aeruginosus%29_male_Danube_delta.jpg',
  'Milvus milvus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Rotmilan_IMG_7373.jpg/800px-Rotmilan_IMG_7373.jpg',
  'Milvus migrans': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Milvus_migrans_qtl1.jpg/800px-Milvus_migrans_qtl1.jpg',
  'Pernis apivorus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Wespenbussard_European_honey_buzzard_Pernis_apivorus%2C_crop.jpg/800px-Wespenbussard_European_honey_buzzard_Pernis_apivorus%2C_crop.jpg',
  'Aquila chrysaetos': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Aquila_chrysaetos_qtl1.jpg/800px-Aquila_chrysaetos_qtl1.jpg',
  'Strix aluco': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Tawny_wiki_edit1.jpg/800px-Tawny_wiki_edit1.jpg',
  'Asio otus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Long-eared_owl_%28Asio_otus%29.jpg/800px-Long-eared_owl_%28Asio_otus%29.jpg',
  'Asio flammeus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Asio-flammeus-001.jpg/800px-Asio-flammeus-001.jpg',
  'Fratercula arctica': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Puffin_%28Fratercula_arctica%29.jpg/800px-Puffin_%28Fratercula_arctica%29.jpg',
  'Gulosus aristotelis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Phalacrocorax_aristotelis_desmarestii.jpg/800px-Phalacrocorax_aristotelis_desmarestii.jpg',
  'Scolopax rusticola': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Waldschnepfe_%28scolopax_rusticola%29_-_Spiekeroog%2C_Nationalpark_Nieders%C3%A4chsisches_Wattenmeer.jpg/800px-Waldschnepfe_%28scolopax_rusticola%29_-_Spiekeroog%2C_Nationalpark_Nieders%C3%A4chsisches_Wattenmeer.jpg',
  'Dendrocopos major': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/2015.05.08.-04-Kaefertaler_Wald-Mannheim--Buntspecht-Weibchen.jpg/800px-2015.05.08.-04-Kaefertaler_Wald-Mannheim--Buntspecht-Weibchen.jpg',
  'Picus viridis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/European_green_woodpecker_%28Picus_viridis%29_male.JPG/800px-European_green_woodpecker_%28Picus_viridis%29_male.JPG',
  'Dryocopus martius': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Black_woodpecker_%28Dryocopus_martius%29.jpg/800px-Black_woodpecker_%28Dryocopus_martius%29.jpg',
  'Certhia familiaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/%D0%9E%D0%B1%D1%8B%D0%BA%D0%BD%D0%BE%D0%B2%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F_%D0%BF%D0%B8%D1%89%D1%83%D1%85%D0%B0_%28Certhia_familiaris%29.jpg/800px-%D0%9E%D0%B1%D1%8B%D0%BA%D0%BD%D0%BE%D0%B2%D0%B5%D0%BD%D0%BD%D0%B0%D1%8F_%D0%BF%D0%B8%D1%89%D1%83%D1%85%D0%B0_%28Certhia_familiaris%29.jpg',
  'Certhia brachydactyla': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Short-toed_treecreeper_%28Certhia_brachydactyla_megarhynchos%29.jpg/800px-Short-toed_treecreeper_%28Certhia_brachydactyla_megarhynchos%29.jpg',
  'Turdus pilaris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Fieldfare_aka_Turdus_pilaris.jpg/800px-Fieldfare_aka_Turdus_pilaris.jpg',
  'Apus apus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Apus_apus_-Barcelona%2C_Spain-8_%281%29.jpg/800px-Apus_apus_-Barcelona%2C_Spain-8_%281%29.jpg',
  'Anthus trivialis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Tree_pipit_%28Anthus_trivialis%29.jpg/800px-Tree_pipit_%28Anthus_trivialis%29.jpg',
  'Ficedula hypoleuca': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/European_Pied_Flycatcher_-_Ficedula_hypoleuca_-_Male.jpg/800px-European_Pied_Flycatcher_-_Ficedula_hypoleuca_-_Male.jpg',
  'Acrocephalus scirpaceus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Teichrohrs%C3%A4nger_%28Acrocephalus_scirpaceus%29_02.jpg/800px-Teichrohrs%C3%A4nger_%28Acrocephalus_scirpaceus%29_02.jpg',
  'Acrocephalus arundinaceus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Great_reed_warbler_%28Acrocephalus_arundinaceus%29.jpg/800px-Great_reed_warbler_%28Acrocephalus_arundinaceus%29.jpg',
  'Luscinia luscinia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Luscinia_luscinia_vogelartinfo_chris_romeiks_CHR3635.jpg/800px-Luscinia_luscinia_vogelartinfo_chris_romeiks_CHR3635.jpg',
  'Phoenicurus phoenicurus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Phoenicurus_phoenicurus_08%28js%29%2C_Lodz_%28Poland%29.jpg/800px-Phoenicurus_phoenicurus_08%28js%29%2C_Lodz_%28Poland%29.jpg',
  'Ciconia ciconia': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/White_Stork.jpg/800px-White_Stork.jpg',
  'Jynx torquilla': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Wryneck_by_Pepe_Reigada.jpg/800px-Wryneck_by_Pepe_Reigada.jpg',
  'Perdix perdix': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Grey_Partridge_Perdix_perdix%2C_Netherlands_1.jpg/800px-Grey_Partridge_Perdix_perdix%2C_Netherlands_1.jpg',
  'Coturnix coturnix': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Coturnix_coturnix%2C_Fraunberg%2C_Bayern%2C_Deutschland_1%2C_Ausschnitt.jpg/800px-Coturnix_coturnix%2C_Fraunberg%2C_Bayern%2C_Deutschland_1%2C_Ausschnitt.jpg',
  'Pastor roseus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Rosy_starling_%28Pastor_roseus%29.jpg/800px-Rosy_starling_%28Pastor_roseus%29.jpg',
}

// ============================================================
// MIGRATION
// ============================================================

async function migrate() {
  console.log('Starting migration...\n')

  // Step 1: Insert birds
  console.log('1. Inserting birds...')
  const birdRows = BIRDS.map(b => ({
    name_da: b.da,
    name_en: b.en,
    scientific_name: b.sci,
    category: b.cat,
    is_common: b.common,
    is_easy: EASY_BIRDS.has(b.sci),
  }))

  const { data: insertedBirds, error: birdError } = await supabase
    .from('birds')
    .upsert(birdRows, { onConflict: 'scientific_name' })
    .select('id, scientific_name')

  if (birdError) {
    console.error('Error inserting birds:', birdError)
    process.exit(1)
  }
  console.log(`   Inserted/updated ${insertedBirds.length} birds`)

  // Build sci -> id lookup
  const birdIdMap = new Map<string, string>()
  for (const b of insertedBirds) {
    birdIdMap.set(b.scientific_name, b.id)
  }

  // Step 2: Insert similarity groups
  console.log('2. Inserting similarity groups...')
  const groupRows = Object.entries(SIMILARITY_GROUPS).map(([slug, g]) => ({
    slug,
    name_da: g.name_da,
    name_en: g.name_en,
  }))

  const { data: insertedGroups, error: groupError } = await supabase
    .from('similarity_groups')
    .upsert(groupRows, { onConflict: 'slug' })
    .select('id, slug')

  if (groupError) {
    console.error('Error inserting groups:', groupError)
    process.exit(1)
  }
  console.log(`   Inserted/updated ${insertedGroups.length} similarity groups`)

  // Build slug -> id lookup
  const groupIdMap = new Map<string, string>()
  for (const g of insertedGroups) {
    groupIdMap.set(g.slug, g.id)
  }

  // Step 3: Insert junction table entries
  console.log('3. Inserting bird-group memberships...')
  const junctionRows: { bird_id: string; group_id: string }[] = []
  for (const [slug, group] of Object.entries(SIMILARITY_GROUPS)) {
    const groupId = groupIdMap.get(slug)
    if (!groupId) continue
    for (const sci of group.members) {
      const birdId = birdIdMap.get(sci)
      if (birdId) {
        junctionRows.push({ bird_id: birdId, group_id: groupId })
      }
    }
  }

  // Delete existing and re-insert (simpler than upsert for junction tables)
  await supabase.from('bird_similarity_group').delete().neq('bird_id', '00000000-0000-0000-0000-000000000000')
  const { error: juncError } = await supabase
    .from('bird_similarity_group')
    .insert(junctionRows)

  if (juncError) {
    console.error('Error inserting junction:', juncError)
    process.exit(1)
  }
  console.log(`   Inserted ${junctionRows.length} bird-group memberships`)

  // Step 4: Insert image overrides
  console.log('4. Inserting image overrides...')
  const imageRows = Object.entries(IMAGE_OVERRIDES).map(([sci, url]) => {
    const birdId = birdIdMap.get(sci)
    if (!birdId) {
      console.warn(`   Warning: No bird found for override: ${sci}`)
      return null
    }
    return {
      bird_id: birdId,
      image_url: url,
      source: 'override',
      status: 'approved',
      is_primary: true,
    }
  }).filter(Boolean)

  // Clear existing overrides
  await supabase.from('bird_images').delete().eq('source', 'override')
  const { data: insertedImages, error: imgError } = await supabase
    .from('bird_images')
    .insert(imageRows as any[])
    .select('id')

  if (imgError) {
    console.error('Error inserting images:', imgError)
    process.exit(1)
  }
  console.log(`   Inserted ${insertedImages?.length ?? 0} image overrides`)

  // Summary
  console.log('\nMigration complete!')
  console.log(`   Birds:       ${insertedBirds.length}`)
  console.log(`   Easy birds:  ${birdRows.filter(b => b.is_easy).length}`)
  console.log(`   Common:      ${birdRows.filter(b => b.is_common).length}`)
  console.log(`   Groups:      ${insertedGroups.length}`)
  console.log(`   Memberships: ${junctionRows.length}`)
  console.log(`   Image overrides: ${insertedImages?.length ?? 0}`)
}

migrate().catch(console.error)
