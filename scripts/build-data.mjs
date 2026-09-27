import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const REGION_META = {
  europe: { name: 'Europa', color: '#3867ff' },
  asia: { name: 'Azja', color: '#ff4d6d' },
  africa: { name: 'Afryka', color: '#ff9f1c' },
  'north-america': { name: 'Ameryka Północna', color: '#8b5cf6' },
  'south-america': { name: 'Ameryka Południowa', color: '#20b486' },
  oceania: { name: 'Australia i Oceania', color: '#ec4899' }
};

const CATEGORY_META = {
  'Półwysep': { color: '#ff8a1f', symbol: '▲' },
  'Morze': { color: '#04b8d8', symbol: '●' },
  'Zatoka': { color: '#2878ff', symbol: '◒' },
  'Cieśnina / kanał': { color: '#9b5de5', symbol: '◆' },
  'Wyspa / archipelag': { color: '#ef4f91', symbol: '⬢' },
  'Rzeka': { color: '#126fe5', symbol: '♦' },
  'Jezioro': { color: '#00a6a6', symbol: '■' },
  'Kraina': { color: '#45a049', symbol: '★' }
};

// region | category | display name | latitude | longitude | Wikipedia title | aliases
const CATALOG = `
europe|Półwysep|Skandynawski|63|14|Półwysep Skandynawski|
europe|Półwysep|Jutlandzki|56|9.3|Półwysep Jutlandzki|Jutlandia
europe|Półwysep|Bretoński|48.2|-3|Półwysep Bretoński|Bretania
europe|Półwysep|Iberyjski (Pirenejski)|40|-4|Półwysep Iberyjski|Iberyjski,Pirenejski
europe|Półwysep|Apeniński|42|13.5|Półwysep Apeniński|Włoski
europe|Półwysep|Bałkański|42|22|Półwysep Bałkański|Bałkany
europe|Półwysep|Peloponez|37.5|22.3|Peloponez|
europe|Półwysep|Krym|45.3|34.1|Półwysep Krymski|Półwysep Krymski
europe|Morze|Białe|66|39|Morze Białe|
europe|Morze|Norweskie|68|2|Morze Norweskie|
europe|Morze|Północne|56|3|Morze Północne|
europe|Morze|Bałtyckie|58|20|Morze Bałtyckie|Bałtyk
europe|Morze|Śródziemne|35|18|Morze Śródziemne|
europe|Morze|Adriatyckie|43|15|Morze Adriatyckie|Adriatyk
europe|Morze|Egejskie|39|25|Morze Egejskie|
europe|Morze|Czarne|43|34|Morze Czarne|
europe|Morze|Azowskie|46|36|Morze Azowskie|
europe|Morze|Kaspijskie|41|51|Morze Kaspijskie|Kaspijskie
europe|Zatoka|Botnicka|63|20|Zatoka Botnicka|
europe|Zatoka|Ryska|57.5|23.5|Zatoka Ryska|
europe|Zatoka|Fińska|60|26|Zatoka Fińska|
europe|Zatoka|Biskajska|45|-4|Zatoka Biskajska|
europe|Cieśnina / kanał|Kattegat|57|11|Kattegat|
europe|Cieśnina / kanał|Skagerrak|58|9|Skagerrak|
europe|Cieśnina / kanał|Kaletańska|51|1.5|Cieśnina Kaletańska|Dover
europe|Cieśnina / kanał|Gibraltarska|36|-5.6|Cieśnina Gibraltarska|
europe|Cieśnina / kanał|Sycylijska|37|12|Cieśnina Sycylijska|
europe|Cieśnina / kanał|Dardanele|40.2|26.4|Dardanele|
europe|Cieśnina / kanał|Bosfor|41.1|29|Bosfor|
europe|Cieśnina / kanał|Mesyńska|38.2|15.6|Cieśnina Mesyńska|
europe|Cieśnina / kanał|Kanał La Manche|50|-2|La Manche|Kanał Angielski
europe|Cieśnina / kanał|Kanał Północny|55|-5.7|Kanał Północny|
europe|Wyspa / archipelag|Nowa Ziemia|74|56|Nowa Ziemia|
europe|Wyspa / archipelag|Svalbard|78|18|Svalbard|Spitsbergen
europe|Wyspa / archipelag|Islandia|65|-18|Islandia|
europe|Wyspa / archipelag|Owcze|62|-6.8|Wyspy Owcze|Faroe
europe|Wyspa / archipelag|Szetlandy|60.3|-1.2|Szetlandy|
europe|Wyspa / archipelag|Wielka Brytania|54|-2|Wielka Brytania (wyspa)|
europe|Wyspa / archipelag|Irlandia|53|-8|Irlandia (wyspa)|
europe|Wyspa / archipelag|Bornholm|55.1|14.9|Bornholm|
europe|Wyspa / archipelag|Gotlandia|57.5|18.5|Gotlandia|
europe|Wyspa / archipelag|Baleary (Majorka, Ibiza, Minorka)|39.6|2.9|Baleary|Majorka,Ibiza,Minorka
europe|Wyspa / archipelag|Korsyka|42.1|9|Korsyka|
europe|Wyspa / archipelag|Sardynia|40|9|Sardynia|
europe|Wyspa / archipelag|Sycylia|37.5|14|Sycylia|
europe|Wyspa / archipelag|Kreta|35.2|24.9|Kreta|
europe|Wyspa / archipelag|Cypr|35.1|33.2|Cypr|
europe|Rzeka|Niemen|54.9|23.9|Niemen|
europe|Rzeka|Wołga|52|47|Wołga|
europe|Rzeka|Dniepr|49|32|Dniepr|
europe|Rzeka|Dniestr|48|28|Dniestr|
europe|Rzeka|Dunaj|46|19|Dunaj|
europe|Rzeka|Pad|45|10|Pad (rzeka)|Po
europe|Rzeka|Ebro|41|-1|Ebro|
europe|Rzeka|Tag|39|-7|Tag (rzeka)|Tagus,Tejo
europe|Rzeka|Loara|47|1|Loara|
europe|Rzeka|Sekwana|49|2|Sekwana|
europe|Rzeka|Ren|50|7|Ren|
europe|Rzeka|Łaba|52|12|Łaba|
europe|Rzeka|Odra|51|15|Odra|
europe|Rzeka|Wisła|52|20|Wisła|
europe|Rzeka|Rodan|45.5|5|Rodan|
europe|Rzeka|Tamiza|51.5|-0.5|Tamiza|
europe|Jezioro|Wener|58.9|13.3|Wener|Vänern
europe|Jezioro|Wetter|58.3|14.5|Wetter (jezioro)|Vättern
europe|Jezioro|Ładoga|60.8|31.5|Ładoga|
europe|Jezioro|Onega|61.7|35.5|Onega (jezioro)|
europe|Jezioro|Balaton|46.8|17.7|Balaton|
asia|Jezioro|Bajkał|53.5|108|Bajkał|
asia|Jezioro|Bałchasz|46|74|Bałchasz (jezioro)|
asia|Jezioro|Aralskie|45|59|Jezioro Aralskie|Aral
asia|Jezioro|Kaspijskie|41|51|Morze Kaspijskie|Kaspijskie
asia|Rzeka|Ob z Irtyszem|57|70|Ob|Ob,Irtysz
asia|Rzeka|Jenisej|58|92|Jenisej|
asia|Rzeka|Lena|62|126|Lena (rzeka)|
asia|Rzeka|Kołyma|66|151|Kołyma|
asia|Rzeka|Huangho (Rzeka Żółta)|35|111|Huang He|Huangho,Rzeka Żółta
asia|Rzeka|Jangcy|30|112|Jangcy|Chang Jiang
asia|Rzeka|Mekong|16|105|Mekong|
asia|Rzeka|Ganges|25|85|Ganges|
asia|Rzeka|Brahmaputra|27|91|Brahmaputra|
asia|Rzeka|Indus|28|69|Indus|
asia|Rzeka|Tygrys|34|43|Tygrys (rzeka)|
asia|Rzeka|Eufrat|35|40|Eufrat|
asia|Rzeka|Amu-daria|41|62|Amu-daria|
asia|Rzeka|Syr-daria|43|68|Syr-daria|
asia|Wyspa / archipelag|Kuryle|47|152|Wyspy Kurylskie|
asia|Wyspa / archipelag|Sachalin|50|143|Sachalin|
asia|Wyspa / archipelag|Hokkaido|43.5|142.5|Hokkaido|
asia|Wyspa / archipelag|Honsiu|36|138|Honsiu|Honshu
asia|Wyspa / archipelag|Tajwan|23.7|121|Tajwan (wyspa)|
asia|Wyspa / archipelag|Filipiny|12.5|122|Filipiny|
asia|Wyspa / archipelag|Sumatra|0|102|Sumatra|
asia|Wyspa / archipelag|Jawa|-7.5|111|Jawa|
asia|Wyspa / archipelag|Borneo|1|114|Borneo|
asia|Wyspa / archipelag|Archipelag Malajski|-2|118|Archipelag Malajski|
asia|Wyspa / archipelag|Cejlon|7.5|80.7|Sri Lanka|Cejlon
asia|Wyspa / archipelag|Malediwy|3.2|73.2|Malediwy|
asia|Morze|Wschodniosyberyjskie|72|165|Morze Wschodniosyberyjskie|
asia|Morze|Beringa|58|-175|Morze Beringa|
asia|Morze|Ochockie|53|150|Morze Ochockie|
asia|Morze|Japońskie|40|135|Morze Japońskie|
asia|Morze|Żółte|35|123|Morze Żółte|
asia|Morze|Filipińskie|20|135|Morze Filipińskie|
asia|Morze|Południowochińskie|13|114|Morze Południowochińskie|
asia|Morze|Jawajskie|-5|112|Morze Jawajskie|
asia|Morze|Arabskie|15|65|Morze Arabskie|
asia|Morze|Czerwone|20|38|Morze Czerwone|
asia|Zatoka|Bengalska|15|88|Zatoka Bengalska|
asia|Zatoka|Omańska|24|58|Zatoka Omańska|
asia|Zatoka|Perska|27|51|Zatoka Perska|
asia|Zatoka|Adeńska|12|48|Zatoka Adeńska|
asia|Cieśnina / kanał|Beringa|66|-169|Cieśnina Beringa|
asia|Cieśnina / kanał|Makasarska|-2|118|Cieśnina Makasarska|
asia|Cieśnina / kanał|Malakka|3|101|Cieśnina Malakka|
asia|Cieśnina / kanał|Ormuz|26.5|56.3|Cieśnina Ormuz|
asia|Cieśnina / kanał|Bab – el – Mandab|12.6|43.3|Bab al-Mandab|Bab el Mandab
africa|Jezioro|Czad|13.1|14.1|Jezioro Czad|
africa|Jezioro|Zbiornik Nasera|22.4|31.8|Jezioro Nasera|
africa|Jezioro|Wiktorii|-1|33|Jezioro Wiktorii|
africa|Jezioro|Tanganika|-6.2|29.6|Jezioro Tanganika|
africa|Jezioro|Niasa (=Malawi)|-12.2|34.5|Jezioro Malawi|Niasa,Malawi
africa|Jezioro|Wolta|7.9|0.1|Jezioro Wolta|
africa|Rzeka|Nil|18|31|Nil|
africa|Rzeka|Senegal|16|-14.5|Senegal (rzeka)|
africa|Rzeka|Wolta|8.5|-0.5|Wolta (rzeka)|
africa|Rzeka|Niger|13|1.5|Niger (rzeka)|
africa|Rzeka|Kongo|-2.5|17|Kongo (rzeka)|
africa|Rzeka|Zambezi|-17|27|Zambezi|
africa|Zatoka|Gwinejska|1|3|Zatoka Gwinejska|
africa|Cieśnina / kanał|Mozambicki|-18|41.5|Kanał Mozambicki|
africa|Cieśnina / kanał|Sueski|30.5|32.3|Kanał Sueski|
africa|Wyspa / archipelag|Madera|32.7|-16.9|Madera|
africa|Wyspa / archipelag|Kanaryjskie|28.3|-16|Wyspy Kanaryjskie|
africa|Wyspa / archipelag|Mauritius|-20.2|57.5|Mauritius|
africa|Wyspa / archipelag|Madagaskar|-19|46.7|Madagaskar|
africa|Wyspa / archipelag|Sokotra|12.5|54|Sokotra (wyspa)|
africa|Wyspa / archipelag|Wyspy Zielonego Przylądka|16|-24|Republika Zielonego Przylądka|Cabo Verde
north-america|Wyspa / archipelag|Grenlandia|72|-40|Grenlandia|
north-america|Wyspa / archipelag|Aleuty|52|-170|Aleuty|
north-america|Wyspa / archipelag|Kuba|21.5|-79.5|Kuba|
north-america|Wyspa / archipelag|Jamajka|18.1|-77.3|Jamajka|
north-america|Wyspa / archipelag|Haiti|19|-72.5|Haiti (wyspa)|Hispaniola
north-america|Wyspa / archipelag|Portoryko|18.2|-66.5|Portoryko|
north-america|Wyspa / archipelag|W-y Bahama|24|-76|Bahamy|Wyspy Bahama
north-america|Wyspa / archipelag|Małe Antyle|15|-61|Małe Antyle|
north-america|Wyspa / archipelag|Bermudy|32.3|-64.8|Bermudy|
north-america|Wyspa / archipelag|Nowa Funlandia|49|-56|Nowa Fundlandia|Nowa Funlandia
north-america|Wyspa / archipelag|Ziemia Baffina|69|-72|Ziemia Baffina|
north-america|Rzeka|Jukon|64|-142|Jukon (rzeka)|
north-america|Rzeka|Kolorado|36|-113|Kolorado (rzeka)|Colorado
north-america|Rzeka|Rio Grande|29|-103|Rio Grande (rzeka w Ameryce Północnej)|
north-america|Rzeka|Missisipi|35|-90|Missisipi (rzeka)|
north-america|Rzeka|Missouri|42|-100|Missouri (rzeka)|
north-america|Rzeka|Św. Wawrzyńca|45.5|-74|Rzeka Świętego Wawrzyńca|Świętego Wawrzyńca
north-america|Jezioro|Wielkie Jezioro Niedźwiedzie|66|-121|Wielkie Jezioro Niedźwiedzie|
north-america|Jezioro|Wielkie Jezioro Niewolnicze|61.5|-114|Wielkie Jezioro Niewolnicze|
north-america|Jezioro|Górne|47.7|-87.5|Jezioro Górne|
north-america|Jezioro|Huron|44.8|-82.4|Huron (jezioro)|
north-america|Jezioro|Erie|42.2|-81.2|Erie (jezioro)|
north-america|Jezioro|Ontario|43.6|-77.9|Ontario (jezioro)|
north-america|Jezioro|Michigan|44|-87|Michigan (jezioro)|
north-america|Jezioro|Wielkie Jezioro Słone|41.2|-112.6|Wielkie Jezioro Słone|
north-america|Morze|Karaibskie|15|-75|Morze Karaibskie|
north-america|Morze|Beringa|58|-175|Morze Beringa|
north-america|Morze|Sargassowe|28|-66|Morze Sargassowe|
north-america|Morze|Baffina|74|-68|Morze Baffina|
north-america|Morze|Grenlandzkie|75|-5|Morze Grenlandzkie|
north-america|Cieśnina / kanał|Beringa|66|-169|Cieśnina Beringa|
north-america|Cieśnina / kanał|Duńska|66|-27|Cieśnina Duńska|
north-america|Cieśnina / kanał|Kanał Panamski|9.1|-79.7|Kanał Panamski|
south-america|Jezioro|Maracaibo|10|-71.6|Jezioro Maracaibo|
south-america|Jezioro|Titicaca|-15.8|-69.4|Jezioro Titicaca|
south-america|Rzeka|Orinoko|7.5|-65|Orinoko|
south-america|Rzeka|Amazonka|-3|-60|Amazonka|
south-america|Rzeka|São Francisco|-10|-44|São Francisco (rzeka)|
south-america|Rzeka|Parana|-25|-56|Parana (rzeka)|Paraná
south-america|Zatoka|La Plata|-35|-56|La Plata (estuarium)|Río de la Plata
south-america|Wyspa / archipelag|Falklandy (Malwiny)|-51.7|-59.2|Falklandy|Malwiny
south-america|Wyspa / archipelag|Ziemia Ognista|-54|-69|Ziemia Ognista|
south-america|Wyspa / archipelag|Galapagos|-0.6|-90.5|Galapagos|
south-america|Cieśnina / kanał|Magellana|-53.5|-71|Cieśnina Magellana|
oceania|Wyspa / archipelag|Tasmania|-42|147|Tasmania|
oceania|Wyspa / archipelag|Nowa Zelandia|-41|174|Nowa Zelandia|
oceania|Wyspa / archipelag|Nowa Gwinea|-5.5|141|Nowa Gwinea|
oceania|Wyspa / archipelag|Nowa Kaledonia|-21.3|165.5|Nowa Kaledonia|
oceania|Wyspa / archipelag|Polinezja|-17|-149|Polinezja|
oceania|Wyspa / archipelag|Hawaje|20.5|-157.5|Hawaje|
oceania|Rzeka|Murray|-35|143|Murray (rzeka)|
oceania|Rzeka|Darling|-30|145|Darling (rzeka)|
oceania|Jezioro|Eyre|-28.4|137.3|Eyre (jezioro)|Kati Thanda
oceania|Kraina|Wielka Rafa Koralowa|-18.3|147.7|Wielka Rafa Koralowa|
oceania|Morze|Timor|-10|127|Morze Timor|
oceania|Morze|Arafura|-9|135|Morze Arafura|
oceania|Morze|Koralowe|-20|155|Morze Koralowe|
oceania|Zatoka|Karpentaria|-15|139|Zatoka Karpentaria|
oceania|Zatoka|Wielka Zatoka Australijska|-34|130|Wielka Zatoka Australijska|
`.trim();

const CUSTOM_FACTS = {
  'Bajkał': [
    'To najgłębsze jezioro świata — jego dno schodzi ponad kilometr pod poziom morza.',
    'W Bajkale mieści się około jednej piątej niezamarzniętej słodkiej wody powierzchniowej Ziemi.',
    'Żyje tu nerpa bajkalska, jedyna foka spędzająca całe życie wyłącznie w słodkiej wodzie.'
  ],
  'Amazonka': [
    'Amazonka niesie do oceanu więcej wody niż kolejnych siedem największych rzek razem.',
    'W jej dorzeczu żyją różowe delfiny rzeczne, które z wiekiem naprawdę różowieją.',
    'Ujście jest tak szerokie, że słodką wodę można wykryć daleko na Atlantyku.'
  ],
  'Nil': [
    'Nil płynie z południa na północ — na szkolnej mapie wygląda więc, jakby płynął „pod górę”.',
    'Coroczne wylewy Nilu przez tysiące lat użyźniały pola starożytnego Egiptu.',
    'Jego dwa główne dopływy, Nil Biały i Nil Błękitny, spotykają się w Chartumie.'
  ],
  'Galapagos': [
    'Tutejsze zięby pomogły Darwinowi zrozumieć, jak gatunki zmieniają się z pokolenia na pokolenie.',
    'Legwany morskie z Galapagos kichają solą, aby pozbyć się jej po podwodnym posiłku.',
    'Żyjące tu żółwie olbrzymie mogą dożyć wieku znacznie przekraczającego sto lat.'
  ],
  'Wielka Rafa Koralowa': [
    'Tworzą ją tysiące osobnych raf i setki wysp, a nie jeden olbrzymi kawałek koralowca.',
    'Budowniczymi rafy są maleńkie polipy — zwierzęta spokrewnione z meduzami.',
    'Rafa jest większa od wielu państw i ciągnie się wzdłuż Australii przez ponad 2000 km.'
  ],
  'Morze Sargassowe': [
    'To jedyne morze bez lądowych brzegów — jego granice wyznaczają prądy oceaniczne.',
    'Nazwa pochodzi od brunatnic sargassowych, które tworzą na wodzie pływające „łąki”.',
    'Węgorz europejski przepływa tu tysiące kilometrów, aby odbyć tarło.'
  ],
  'Sokotra': [
    'Smocze drzewa Sokotry wyglądają jak parasole ustawione do góry nogami.',
    'Ponad jedna trzecia tutejszych gatunków roślin nie rośnie dziko nigdzie indziej.',
    'Wyspa przez miliony lat rozwijała własną przyrodę w niemal całkowitej izolacji.'
  ],
  'Jezioro Aralskie': [
    'Dawne porty stoją dziś pośrodku pustyni, wiele kilometrów od obecnej linii brzegowej.',
    'Jezioro skurczyło się głównie po skierowaniu wód zasilających je rzek na pola bawełny.',
    'Na odsłoniętym dnie powstała nowa pustynia nazwana Aralkum.'
  ],
  'Morze Martwe': [],
  'Grenlandia': [
    'Nazwa oznacza „zielony ląd” — miała zachęcić osadników, choć większość wyspy pokrywa lód.',
    'To największa wyspa świata, jeśli Australię traktujemy jako kontynent.',
    'Pod lądolodem kryją się doliny i góry, których nie widać na zwykłej mapie.'
  ],
  'Islandia': [
    'Islandia ma ponad sto wulkanów, dlatego gorąca woda z ziemi ogrzewa większość domów.',
    'Na wyspie niemal nie ma komarów — klimat skutecznie psuje im plany.',
    'Można tu stanąć między płytą północnoamerykańską i eurazjatycką.'
  ],
  'Kanał Panamski': [
    'Statki są podnoszone w śluzach na wysokość sztucznego jeziora, a potem opuszczane po drugiej stronie.',
    'Kanał pozwala ominąć wielotysięczną podróż wokół Ameryki Południowej.',
    'Do napełniania śluz używa głównie grawitacji, a nie gigantycznych pomp.'
  ],
  'Kanał Sueski': [
    'Łączy Morze Śródziemne z Czerwonym bez używania ani jednej śluzy.',
    'Skraca drogę z Europy do Azji, bo statki nie muszą opływać całej Afryki.',
    'W 2021 roku jeden zaklinowany kontenerowiec na kilka dni zatrzymał znaczną część światowego handlu.'
  ],
  'Hawaje': [
    'Wyspy leżą nad plamą gorąca, a płyta oceaniczna przesuwa je jak taśma transportowa.',
    'Mauna Kea liczona od podstawy na dnie oceanu jest wyższa niż Mount Everest.',
    'Alfabet hawajski jest wyjątkowo krótki i ma tylko trzynaście znaków.'
  ],
  'Jezioro Titicaca': [
    'Po jeziorze pływają zamieszkane wyspy budowane z warstw trzciny totora.',
    'Leży wyżej niż większość europejskich szczytów, a mimo to kursują po nim duże statki.',
    'Według tradycji Inków z jego wód wyłonili się pierwsi przodkowie ich władców.'
  ],
  'Madagaskar': [
    'Zdecydowana większość dzikich lemurów żyje tylko tutaj.',
    'Wyspa odłączyła się od innych lądów tak dawno, że jej przyroda poszła własną drogą.',
    'Baobaby magazynują wodę w pniach, przez co wyglądają jak drzewa posadzone korzeniami do góry.'
  ],
  'Morze Czerwone': [
    'Wbrew nazwie zwykle jest intensywnie niebieskie, a czerwienieje tylko podczas zakwitów glonów.',
    'Parowanie jest tu tak silne, że woda należy do najbardziej słonych w oceanach.',
    'Młode morze powiększa się, ponieważ Afryka i Arabia powoli się od siebie odsuwają.'
  ],
  'Jezioro Maracaibo': [
    'Nad ujściem rzeki Catatumbo błyskawice pojawiają się przez wyjątkowo wiele nocy w roku.',
    'Akwen łączy się z Morzem Karaibskim, dlatego bywa nazywany zarówno jeziorem, jak i zatoką.',
    'To jeden z najstarszych dużych zbiorników wodnych na Ziemi.'
  ],
  'Morze Bałtyckie': [
    'Bałtyk jest tak słabo słony, że żyją w nim obok siebie gatunki morskie i słodkowodne.',
    'Wymiana wody z oceanem odbywa się przez wąskie cieśniny duńskie i trwa bardzo długo.',
    'Na jego dnie spoczywają tysiące wraków, często świetnie zachowanych w chłodnej wodzie.'
  ],
  'Wołga': [
    'Wołga jest najdłuższą rzeką Europy i w całości płynie przez Rosję.',
    'Nie wpada do oceanu — kończy bieg w bezodpływowym Morzu Kaspijskim.',
    'Jej delta tworzy plątaninę odnóg i jest ważnym przystankiem ptaków wędrownych.'
  ],
  'Wielkie Jezioro Słone': [
    'Woda jest tak słona, że pływak unosi się w niej łatwiej niż w zwykłym jeziorze.',
    'Poziom jeziora mocno się zmienia, więc jego powierzchnia potrafi kurczyć się i rosnąć.',
    'W słonej wodzie żyją miliardy maleńkich krewetek solankowych.'
  ],
  'Morze Północne': [
    'Pod wodą kryje się Doggerland — kraina, która tysiące lat temu łączyła Brytanię z Europą.',
    'Morze Północne jest jednym z najważniejszych na świecie obszarów wydobycia ropy i gazu spod dna.',
    'Płytkie ławice i częste sztormy sprawiały, że przez wieki było wyjątkowo zdradliwe dla statków.'
  ],
  'Półwysep Bałkański': [
    'Nazwa „Bałkany” pochodzi od tureckiego słowa oznaczającego zalesione góry.',
    'Na półwyspie spotykają się wpływy Europy, Azji i dawnego świata śródziemnomorskiego.',
    'Wybrzeże jest tak poszarpane, że na mapie wygląda jak ląd rozsypany na tysiące wysp.'
  ],
  'Morze Azowskie': [
    'To najpłytsze morze świata — przeciętna głębokość wynosi zaledwie kilka metrów.',
    'Zimą płytka woda łatwo zamarza, choć morze leży znacznie dalej na południe niż Bałtyk.',
    'Łączy się z Morzem Czarnym tylko przez wąską Cieśninę Kerczeńską.'
  ],
  'Zatoka Fińska': [
    'Na jej przeciwległych brzegach leżą stolice Finlandii i Estonii: Helsinki oraz Tallinn.',
    'Zimą część zatoki zamarza, więc statkom pomagają lodołamacze.',
    'Na wschodnim końcu zatoki leży Petersburg, zbudowany na wyspach delty Newy.'
  ],
  'Irlandia (wyspa)': [
    'Nazywa się ją Zieloną Wyspą, bo łagodny i wilgotny klimat sprzyja soczyście zielonym łąkom.',
    'Na wyspie nie występują dziko węże — legenda przypisuje ich brak świętemu Patrykowi.',
    'Jedna wyspa mieści Republikę Irlandii oraz Irlandię Północną należącą do Wielkiej Brytanii.'
  ],
  'Kattegat': [
    'Nazwa bywa tłumaczona jako „kocia dziura” — dawnym żeglarzom przejście wydawało się bardzo ciasne.',
    'Kattegat leży między Danią i Szwecją oraz prowadzi z Bałtyku ku Morzu Północnemu.',
    'Choć zwykle nazywany cieśniną, jest znacznie szerszy od typowej cieśniny.'
  ],
  'Skagerrak': [
    'Jego nazwa pochodzi od duńskiego miasta Skagen oraz dawnego słowa oznaczającego prosty odcinek.',
    'W głębokim rowie Skagerraku dno opada znacznie niżej niż w sąsiednim, płytkim Kattegacie.',
    'To morska brama łącząca Morze Północne z drogą prowadzącą na Bałtyk.'
  ],
  'Nowa Ziemia': [
    'Archipelag tworzą dwie wielkie wyspy rozdzielone bardzo wąską cieśniną Matoczkin Szar.',
    'W 1961 roku zdetonowano tu Car-bombę — najpotężniejszy ładunek jądrowy w historii.',
    'Północna część archipelagu jest niemal całkowicie przykryta lodowcami.'
  ],
  'Gotlandia': [
    'Na Gotlandii znaleziono tysiące srebrnych monet przywiezionych przez wikingów z odległych krajów.',
    'Średniowieczne mury Visby należą do najlepiej zachowanych fortyfikacji miejskich Europy.',
    'Wapienne skalne kolumny zwane raukami wyglądają tu jak naturalne rzeźby.'
  ],
  'Sekwana': [
    'Sekwana dzieli Paryż na słynny Lewy i Prawy Brzeg.',
    'Na rzece znajduje się wyspa Île de la Cité, na której stoi katedra Notre-Dame.',
    'Jej zakola są tak wyraźne, że z lotu ptaka rzeka przypomina wijącą się wstęgę.'
  ],
  'Dunaj': [
    'Dunaj przepływa przez więcej stolic niż jakakolwiek inna rzeka świata.',
    'Zaczyna się w niemieckim Schwarzwaldzie, a kończy rozległą deltą nad Morzem Czarnym.',
    'Walc „Nad pięknym modrym Dunajem” rozsławił rzekę, choć jej woda zwykle nie jest niebieska.'
  ],
  'Sardynia': [
    'Na wyspie stoją tysiące tajemniczych kamiennych wież nuragów sprzed ponad trzech tysięcy lat.',
    'Sardyński należy do języków romańskich najbardziej podobnych do łaciny.',
    'Na niektórych plażach piasek ma różowy kolor dzięki drobnym fragmentom organizmów morskich.'
  ],
  'Kołyma': [
    'Kołyma przez większą część roku jest skuta lodem, a roztopy potrafią wywołać ogromne zatory.',
    'Jej dorzecze leży w jednym z najzimniejszych zamieszkanych regionów świata.',
    'Nazwa Kołyma kojarzy się także z tragiczną siecią sowieckich łagrów.'
  ],
  'Ob': [
    'Ob z Irtyszem tworzy jeden z najdłuższych systemów rzecznych świata.',
    'Ujście rzeki przechodzi w Zatokę Obską długą na setki kilometrów.',
    'Wiosenne roztopy płyną z południa ku wciąż zamarzniętej północy, powodując wielkie rozlewiska.'
  ],
  'Rodan': [
    'Rodan wypływa z lodowca w Alpach i po drodze przepływa przez Jezioro Genewskie.',
    'Silny wiatr mistral potrafi pędzić wzdłuż doliny Rodanu aż do Morza Śródziemnego.',
    'W delcie rzeki, zwanej Camargue, żyją półdzikie białe konie i stada flamingów.'
  ],
  'Jangcy': [
    'Jangcy jest najdłuższą rzeką Azji i trzecią pod względem długości na świecie.',
    'Przy rzece stoi Zapora Trzech Przełomów, jedna z największych elektrowni wodnych świata.',
    'W jej dorzeczu żyje aligator chiński — znacznie mniejszy kuzyn aligatora amerykańskiego.'
  ],
  'Balaton': [
    'Balaton jest tak płytki, że latem jego woda szybko nagrzewa się jak w ogromnym basenie.',
    'Węgrzy nazywają go swoim morzem, ponieważ ich kraj nie ma dostępu do oceanu.',
    'Półwysep Tihany niemal przecina jezioro na dwie części.'
  ],
  'Onega (jezioro)': [
    'Na wyspie Kiży stoją drewniane cerkwie zbudowane bez użycia metalowych gwoździ.',
    'Po jeziorze rozsianych jest ponad tysiąc wysp.',
    'Onega jest drugim co do wielkości jeziorem Europy, ustępując tylko Ładodze.'
  ],
  'Wetter (jezioro)': [
    'Wetter jest drugim co do wielkości jeziorem Szwecji.',
    'Na jeziorze leży Visingsö, wyspa związana ze średniowiecznymi królami Szwecji.',
    'Woda jest wyjątkowo przejrzysta, a jezioro zasila krótką rzekę Motala ström.'
  ],
  'Bałchasz (jezioro)': [
    'Zachodnia część jeziora jest prawie słodka, a wschodnia wyraźnie słona.',
    'Obie różne części łączy wąska cieśnina Uzynaral.',
    'Bałchasz jest bezodpływowy — woda opuszcza go głównie przez parowanie.'
  ],
  'Indus': [
    'Od nazwy Indusu pochodzą słowa „Indie” i „Hindus”.',
    'Nad rzeką rozwinęła się jedna z najstarszych cywilizacji miejskich świata.',
    'Indus zaczyna bieg na Wyżynie Tybetańskiej i przecina suche obszary Pakistanu.'
  ],
  'Tygrys (rzeka)': [
    'Tygrys i Eufrat otaczały Mezopotamię — krainę nazywaną kolebką cywilizacji.',
    'Nazwa rzeki bywa łączona ze słowem oznaczającym strzałę, bo nurt jest szybki.',
    'W Bagdadzie Tygrys dzieli miasto na dwie historyczne części.'
  ],
  'Zatoka Adeńska': [
    'To jedna z najruchliwszych dróg morskich między Oceanem Indyjskim a Kanałem Sueskim.',
    'Łączy się z Morzem Czerwonym przez wąską cieśninę Bab al-Mandab.',
    'Jej północny brzeg należy do Jemenu, a południowy do Somalii i Dżibuti.'
  ],
  'Morze Jawajskie': [
    'Morze Jawajskie jest płytkie, bo zalewa fragment dawnego szelfu łączącego wyspy z Azją.',
    'Otaczają je jedne z najludniejszych wysp świata, w tym Jawa i Borneo.',
    'W czasie epok lodowych znaczna część jego dna była suchym lądem.'
  ],
  'Republika Zielonego Przylądka': [
    'Archipelag jest wulkaniczny, a Pico do Fogo nadal przypomina o swoim ognistym pochodzeniu.',
    'Nazwa kraju sugeruje zieleń, lecz wiele wysp ma suchy, niemal pustynny krajobraz.',
    'Muzyka morna rozsławiona przez Cesárię Évorę jest jednym z symboli wysp.'
  ],
  'Zambezi': [
    'Na Zambezi leżą Wodospady Wiktorii, których lokalna nazwa oznacza „dym, który grzmi”.',
    'Rzeka tworzy granice kilku państw południowej Afryki.',
    'Olbrzymie Jezioro Kariba powstało po przegrodzeniu Zambezi zaporą.'
  ],
  'Bahamy': [
    'Archipelag liczy setki wysp i tysiące mniejszych skał, ale zamieszkana jest tylko część z nich.',
    'Na wyspie Big Major Cay świnie pływają w morzu i podpływają do łodzi.',
    'Błękitne dziury Bahamów to zalane jaskinie, które z góry wyglądają jak granatowe kręgi.'
  ],
  'Jamajka': [
    'Jamajka jest ojczyzną reggae i miejscem narodzin Boba Marleya.',
    'Nazwa wyspy pochodzi od słowa Xaymaca, czyli „kraina drewna i wody”.',
    'Jamajscy sprinterzy od lat należą do najszybszych ludzi świata.'
  ],
  'Missouri (rzeka)': [
    'Missouri jest dłuższa od Missisipi, choć formalnie pozostaje jej dopływem.',
    'Razem z Missisipi tworzy najdłuższy system rzeczny Ameryki Północnej.',
    'Niesiony muł nadał jej przydomek „Wielka Błotnista”.'
  ],
  'Rio Grande (rzeka w Ameryce Północnej)': [
    'Na dużym odcinku Rio Grande wyznacza granicę między Stanami Zjednoczonymi a Meksykiem.',
    'W Meksyku rzeka nazywa się Río Bravo, czyli „dzika rzeka”.',
    'W suchych latach jej nurt bywa tak słaby, że nie zawsze dociera do morza.'
  ],
  'Falklandy': [
    'Na wyspach mieszka więcej owiec niż ludzi.',
    'Nie rosną tu naturalnie drzewa, bo klimat jest chłodny i bardzo wietrzny.',
    'Falklandy i Malwiny to dwie nazwy archipelagu, o który spierają się Wielka Brytania i Argentyna.'
  ],
  'Eyre (jezioro)': [
    'Przez większość czasu jezioro jest suchą solną równiną.',
    'Po rzadkich ulewach pustynne jezioro wypełnia się wodą i przyciąga tysiące ptaków.',
    'To najniżej położone miejsce Australii, około 15 metrów poniżej poziomu morza.'
  ],
  'Nowa Kaledonia': [
    'Otacza ją jedna z największych lagun świata, chroniona długim pierścieniem raf.',
    'Na wyspach występuje kagu — ptak, który prawie nie lata i ma charakterystyczny czub.',
    'Gleby są bogate w nikiel, dlatego górnictwo odgrywa tu ogromną rolę.'
  ],
  'Morze Koralowe': [
    'Na jego zachodnim skraju leży Wielka Rafa Koralowa.',
    'Morze nazwano od licznych raf i atoli zbudowanych przez maleńkie polipy.',
    'W 1942 roku rozegrała się tu pierwsza bitwa morska, w której wrogie okręty nie widziały się bezpośrednio.'
  ],
  'Półwysep Krymski': [
    'Krym łączy się z lądem przesmykiem tak wąskim, że półwysep wygląda na mapie niemal jak wyspa.',
    'Południowe wybrzeże osłaniają Góry Krymskie, dzięki czemu ma ono łagodniejszy klimat.',
    'W pobliżu Jałty znajduje się „Jaskółcze Gniazdo” — zameczek stojący na krawędzi wysokiego klifu.'
  ],
  'Wyspy Kurylskie': [
    'Kuryle tworzą długi łańcuch wulkanicznych wysp między Japonią a Kamczatką.',
    'Na archipelagu działa wiele wulkanów, a gorące źródła są częścią codziennego krajobrazu.',
    'Wyspy leżą w strefie częstych trzęsień ziemi i tsunami zwanej Pacyficznym Pierścieniem Ognia.'
  ],
  'Wyspy Kanaryjskie': [
    'Nazwa archipelagu pochodzi prawdopodobnie od psów, a nie od żółtych kanarków.',
    'Kanarki nazwano od wysp — to ptaki dostały nazwę geograficzną, nie odwrotnie.',
    'Na Teneryfie wznosi się Teide, najwyższy szczyt Hiszpanii i ogromny wulkan.'
  ],
  'La Manche': [
    'Francuzi nazywają kanał La Manche, czyli „rękaw”, a Brytyjczycy po prostu Kanałem Angielskim.',
    'Pod dnem biegnie Eurotunel, którym pociąg może przejechać z Francji do Anglii.',
    'Najwęższy odcinek ma około 34 km, dlatego przy dobrej pogodzie widać drugi brzeg.'
  ],
  'Amu-daria': [
    'Starożytni znali tę rzekę jako Oksos.',
    'Woda Amu-darii była masowo kierowana na pola bawełny, co przyczyniło się do wysychania Jeziora Aralskiego.',
    'Jej nurt płynie przez pustynne obszary Azji Środkowej i często zmieniał swoje koryto.'
  ],
  'Jezioro Czad': [
    'Jezioro jest bardzo płytkie, więc jego rozmiar potrafi gwałtownie zmieniać się między porami roku.',
    'Wokół jego brzegów spotykają się granice czterech państw.',
    'Mimo nazwy tylko część jeziora leży w Czadzie.'
  ],
  'Madera': [
    'Madera oznacza po portugalsku „drewno” — odkrywcy zastali wyspę gęsto porośniętą lasem.',
    'Wodę po stromych zboczach rozprowadzają lewady, czyli setki kilometrów wąskich kanałów.',
    'Tradycyjne sanie z wiklinowymi fotelami zjeżdżają ulicami Funchal mimo całkowitego braku śniegu.'
  ],
  'Mauritius': [
    'Mauritius był ojczyzną dodo — nielotnego ptaka, który stał się symbolem wymierania gatunków.',
    'Na wyspie nie ma naturalnie występujących jadowitych węży lądowych.',
    'Kolorowe wydmy Chamarel tworzą pasma piasku w odcieniach czerwieni, fioletu i żółci.'
  ],
  'Portoryko': [
    'Nazwa Portoryko oznacza „bogaty port”, choć początkowo tak nazywano miasto, a wyspę San Juan.',
    'W lasach żyją maleńkie żabki coquí, których głośne wołanie stało się symbolem wyspy.',
    'Radioteleskop Arecibo przez dziesięciolecia mieścił się w naturalnym zagłębieniu terenu.'
  ],
  'Tasmania': [
    'Diabeł tasmański wydaje tak przeraźliwe dźwięki, że pierwsi osadnicy uznali je za diabelskie.',
    'Przez tysiące lat wyspa była połączona z Australią, zanim podnoszące się morze zalało lądowy most.',
    'Na Tasmanii rosną jedne z najwyższych drzew liściastych świata.'
  ],
  'Półwysep Jutlandzki': [
    'Jutlandia jest jedyną częścią Danii połączoną lądem z resztą Europy.',
    'Jej północny kraniec jest dziś wyspą, ponieważ sztorm w 1825 roku przebił mierzeję.',
    'Na przylądku Skagen fale Morza Północnego i Bałtyku spotykają się pod różnymi kątami.'
  ],
  'Morze Egejskie': [
    'Na Morzu Egejskim rozsianych jest tak wiele wysp, że starożytni żeglarze rzadko tracili ląd z oczu.',
    'Według mitu nazwę morza dał król Egeusz, który rzucił się do wody po zobaczeniu czarnych żagli.',
    'To właśnie nad jego brzegami rozwinęły się cywilizacje minojska i mykeńska.'
  ],
  'Dniepr': [
    'Dniepr przepływa przez trzy państwa i przecina stolicę Ukrainy, Kijów.',
    'Wikingowie wykorzystywali go jako część szlaku handlowego „od Waregów do Greków”.',
    'Wielkie zapory zmieniły długie odcinki rzeki w łańcuch sztucznych jezior.'
  ]
};

const entries = CATALOG.split('\n').map((line) => {
  const [region, category, name, latitude, longitude, wikiTitle, aliases = ''] = line.split('|');
  return {
    region,
    category,
    name,
    latitude: Number(latitude),
    longitude: Number(longitude),
    wikiTitle,
    aliases: aliases ? aliases.split(',') : []
  };
});

function slugify(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function splitSentences(text) {
  const protectedText = text
    .replace(/\[[^\]]*]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(ok|tys|mln|mld|m\.in|np|tzw|ang|fr|niem|ros|hiszp|port|wł|łac|gr|duń|szw|norw|isl|far|arab|pers|irl|wal|gael|azer|rum|ukr|fiń|czes|słow|serb|bułg|chorw|kat|bask|niderl|tur|chin|jap|indonez|malaj|hebr)\./gi, '$1∯');
  return protectedText
    .split(/(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ0-9])/)
    .map((sentence) => sentence.replaceAll('∯', '.').trim())
    .filter((sentence) => sentence.length >= 35 && sentence.length <= 260);
}

function shorten(sentence, maximum = 175) {
  let clean = sentence.trim();
  const definitionDash = clean.search(/\s[–—]\s/);
  if (definitionDash > 0 && definitionDash < 210) {
    clean = clean.slice(definitionDash + 3);
  }
  for (let pass = 0; pass < 3; pass += 1) {
    clean = clean.replace(/\([^()]*\b(?:ang|fr|niem|ros|hiszp|port|wł|łac|gr|duń|szw|norw|isl|far|arab|pers|irl|wal|gael|azer|rum|ukr|fiń|czes|słow|serb|bułg|chorw|kat|bask|niderl|tur|chin|jap|indonez|malaj|hebr|wym|dosł)\.[^()]*\)/gi, '');
  }
  clean = clean
    .replace(/\([^)]{45,}\)/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[,;:)\s–—-]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean) clean = `${clean[0].toLocaleUpperCase('pl-PL')}${clean.slice(1)}`;
  if (clean.length <= maximum) return clean;
  const shortened = clean.slice(0, maximum - 1);
  const cut = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, cut > 100 ? cut : maximum - 1).replace(/[,:;\s]+$/, '')}…`;
}

const INTERESTING = /naj|jedyn|niezwyk|rekord|wulkan|głębo|słon|endem|lod|prąd|powsta|nazwa|gatunk|ptak|ryb|żółw|fok|delfin|koral|pustyn|trzęsie|starożyt|mit|legenda|zamarz|odkry|pierwsz|ostatn|wygin|unikat|tysiąc|milion/i;
const MISSING_FACTS = [];
const MANUAL_FACTS = JSON.parse(await readFile(`${ROOT}/scripts/manual-facts.json`, 'utf8'));

async function loadCachedPages() {
  const cache = JSON.parse(await readFile(`${ROOT}/scripts/wiki-pages-cache.json`, 'utf8'));
  return new Map(Object.entries(cache));
}

function factsFor(entry, page) {
  const custom = MANUAL_FACTS[entry.wikiTitle] || CUSTOM_FACTS[entry.wikiTitle] || CUSTOM_FACTS[entry.name];
  if (custom?.length === 3) return custom;
  const sentences = splitSentences(page?.extract || '');
  const ranked = sentences
    .map((sentence, index) => {
      const foreignNotation = /\b(?:ang|fr|niem|ros|hiszp|port|wł|łac|gr|duń|szw|norw|arab|pers|chin|jap|wym)\./i.test(sentence);
      const definitionStyle = /\s[–—]\s/.test(sentence.slice(0, 220));
      const score = (INTERESTING.test(sentence) ? 14 : 0)
        - (index === 0 ? 5 : index * 0.2)
        - (foreignNotation ? 9 : 0)
        - (definitionStyle ? 4 : 0)
        - (sentence.match(/\(/g)?.length || 0) * 1.5;
      return { sentence, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ sentence }) => shorten(sentence))
    .filter((sentence) => {
      const hasForeignScript = /[\u0400-\u04ff\u0600-\u06ff\u0e00-\u0e7f\u0f00-\u0fff\u4e00-\u9fff]/.test(sentence);
      const hasForeignAbbreviation = /\b(?:ang|fr|niem|ros|hiszp|port|wł|łac|gr|duń|szw|norw|arab|pers|chin|jap|wietn|taj|tybet|urdu|maled|azer|kaz|turkm|wym|trl)\./i.test(sentence);
      const looksLikeFragment = /^(?:Źródłowe potoki|Rozwinięte rybołówstwo|Powierzchnia \d|\d+[\s,.]|[A-ZĄĆĘŁŃÓŚŹŻ][^.!?]{0,30}\)\s*[–—])/.test(sentence);
      const hasPredicate = /\b(?:jest|są|ma|mają|miał|miała|leży|leżą|znajduje|znajdują|wynosi|osiąga|tworzy|tworzą|pochodzi|wpada|uchodzi|przepływa|płynie|łączy|oddziela|występuje|występują|żyje|żyją|rośnie|rosną|został|została|zostały|był|była|były|nazywa|nazywają|obejmuje|stanowi|składa|należy|otacza|wznosi|powstał|powstała|powstały|zamieszkuje|wydobywa|pokrywa|mierzy|rozciąga|zajmuje|zamarza|daje|umożliwia|dzieli|przecina|prowadzi|wpływa|wypływa|chroni|wyróżnia|przyciąga|liczy|graniczy|służy|działa|odkryto|uznawany|uważany)\b/i.test(sentence);
      return sentence.length >= 45
        && !sentence.includes('…')
        && !hasForeignScript
        && !hasForeignAbbreviation
        && !looksLikeFragment
        && hasPredicate;
    });
  const unique = [...new Set(ranked)].slice(0, 3);
  if (unique.length < 3) {
    MISSING_FACTS.push(`${entry.name} (${entry.wikiTitle}): ${unique.length}/3`);
    return unique;
  }
  return unique;
}

async function main() {
  console.log(`Buduję katalog ${entries.length} miejsc…`);
  const pages = await loadCachedPages();
  console.log(`Wczytano lokalny cache ${pages.size} tytułów źródłowych.`);

  const locations = entries.map((entry, index) => {
    const page = pages.get(entry.wikiTitle);
    return {
      id: `${entry.region}-${slugify(entry.category)}-${slugify(entry.name)}`,
      name: entry.name,
      aliases: entry.aliases,
      region: entry.region,
      regionName: REGION_META[entry.region].name,
      category: entry.category,
      latitude: entry.latitude,
      longitude: entry.longitude,
      facts: factsFor(entry, page),
      source: {
        title: page?.title || entry.wikiTitle,
        url: page?.fullurl || `https://pl.wikipedia.org/wiki/${encodeURIComponent(entry.wikiTitle.replaceAll(' ', '_'))}`
      },
      image: {
        url: page?.thumbnail?.source || '',
        alt: `${entry.name} — zdjęcie lub mapa poglądowa`,
        sourceTitle: page?.title || entry.wikiTitle,
        sourceUrl: page?.fullurl || `https://pl.wikipedia.org/wiki/${encodeURIComponent(entry.wikiTitle.replaceAll(' ', '_'))}`
      },
      order: index + 1
    };
  });

  if (MISSING_FACTS.length) {
    throw new Error(`Za mało ciekawostek dla ${MISSING_FACTS.length} miejsc:\n- ${MISSING_FACTS.join('\n- ')}`);
  }

  const output = {
    schemaVersion: 1,
    generatedAt: '2026-09-27',
    factPolicy: 'Dokładnie trzy krótkie ciekawostki na miejsce; aplikacja nie wyszukuje ich w sieci.',
    sourcesNote: 'Ciekawostki zredagowano na podstawie artykułów polskiej Wikipedii; odnośnik źródłowy znajduje się przy każdym rekordzie.',
    regionMeta: REGION_META,
    categoryMeta: CATEGORY_META,
    locations
  };

  await mkdir(`${ROOT}/src/data`, { recursive: true });
  await writeFile(`${ROOT}/src/data/locations.json`, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Zapisano ${locations.length} miejsc i ${locations.length * 3} ciekawostek.`);
}

await main();