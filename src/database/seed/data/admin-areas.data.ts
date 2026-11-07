import type { Province } from '../../schema';
import type { AdminAreaSeed } from '../types/seed.types';

const sectors = (...names: string[]): AdminAreaSeed[] => names.map((name) => ({ name }));

// All 5 provinces and 30 districts. Sectors are complete for Kigali City and partial elsewhere;
// cells and villages are sample data for Remera and Kimironko sectors only.
// Replace with the official NISR administrative boundaries dataset before production use.
export const ADMIN_AREAS: { province: Province; name: string; districts: AdminAreaSeed[] }[] = [
  {
    province: 'KIGALI_CITY',
    name: 'Kigali City',
    districts: [
      {
        name: 'Gasabo',
        children: [
          ...sectors('Bumbogo', 'Gatsata', 'Gikomero', 'Gisozi', 'Jabana', 'Jali', 'Kacyiru'),
          ...sectors('Kimihurura', 'Kinyinya', 'Ndera', 'Nduba', 'Rusororo', 'Rutunga'),
          {
            name: 'Kimironko',
            children: [
              { name: 'Bibare', children: sectors('Ineza', 'Imena', 'Urugwiro') },
              { name: 'Kibagabaga', children: sectors('Akintwari', 'Amahoro', 'Urumuri') },
              { name: 'Nyagatovu', children: sectors('Ubumwe', 'Isangano', 'Intwari') },
            ],
          },
          {
            name: 'Remera',
            children: [
              { name: 'Nyabisindu', children: sectors('Amarembo I', 'Amarembo II', 'Urukundo') },
              { name: 'Nyarutarama', children: sectors('Kamahwa', 'Kangondo I', 'Kangondo II') },
              { name: 'Rukiri I', children: sectors('Amahoro', 'Ruturusu I', 'Ruturusu II') },
              { name: 'Rukiri II', children: sectors('Izuba', 'Rebero', 'Umucyo') },
            ],
          },
        ],
      },
      {
        name: 'Kicukiro',
        children: sectors(
          'Gahanga',
          'Gatenga',
          'Gikondo',
          'Kagarama',
          'Kanombe',
          'Kicukiro',
          'Kigarama',
          'Masaka',
          'Niboye',
          'Nyarugunga',
        ),
      },
      {
        name: 'Nyarugenge',
        children: sectors(
          'Gitega',
          'Kanyinya',
          'Kigali',
          'Kimisagara',
          'Mageragere',
          'Muhima',
          'Nyakabanda',
          'Nyamirambo',
          'Nyarugenge',
          'Rwezamenyo',
        ),
      },
    ],
  },
  {
    province: 'NORTHERN',
    name: 'Northern Province',
    districts: [
      { name: 'Burera', children: sectors('Cyanika', 'Gahunga', 'Rugarama') },
      { name: 'Gakenke', children: sectors('Gakenke', 'Nemba', 'Ruli') },
      { name: 'Gicumbi', children: sectors('Byumba', 'Kageyo', 'Rukomo') },
      { name: 'Musanze', children: sectors('Cyuve', 'Kinigi', 'Muhoza', 'Musanze', 'Nyange') },
      { name: 'Rulindo', children: sectors('Base', 'Bushoki', 'Shyorongi') },
    ],
  },
  {
    province: 'SOUTHERN',
    name: 'Southern Province',
    districts: [
      { name: 'Gisagara', children: sectors('Gikonko', 'Ndora', 'Save') },
      { name: 'Huye', children: sectors('Huye', 'Mukura', 'Ngoma', 'Tumba', 'Rusatira') },
      { name: 'Kamonyi', children: sectors('Gacurabwenge', 'Runda', 'Rukoma') },
      { name: 'Muhanga', children: sectors('Cyeza', 'Nyamabuye', 'Shyogwe') },
      { name: 'Nyamagabe', children: sectors('Gasaka', 'Kitabi', 'Tare') },
      { name: 'Nyanza', children: sectors('Busasamana', 'Mukingo', 'Ntyazo') },
      { name: 'Nyaruguru', children: sectors('Kibeho', 'Munini', 'Ruheru') },
      { name: 'Ruhango', children: sectors('Byimana', 'Kinazi', 'Ruhango') },
    ],
  },
  {
    province: 'EASTERN',
    name: 'Eastern Province',
    districts: [
      { name: 'Bugesera', children: sectors('Nyamata', 'Ntarama', 'Rilima') },
      { name: 'Gatsibo', children: sectors('Gatsibo', 'Kabarore', 'Kiziguro') },
      { name: 'Kayonza', children: sectors('Kabarondo', 'Mukarange', 'Rwinkwavu') },
      { name: 'Kirehe', children: sectors('Kirehe', 'Mahama', 'Nyamugari') },
      { name: 'Ngoma', children: sectors('Kibungo', 'Rukumberi', 'Zaza') },
      { name: 'Nyagatare', children: sectors('Karangazi', 'Nyagatare', 'Rwimiyaga') },
      { name: 'Rwamagana', children: sectors('Kigabiro', 'Muhazi', 'Musha') },
    ],
  },
  {
    province: 'WESTERN',
    name: 'Western Province',
    districts: [
      { name: 'Karongi', children: sectors('Bwishyura', 'Gishyita', 'Rubengera') },
      { name: 'Ngororero', children: sectors('Kabaya', 'Ngororero', 'Sovu') },
      { name: 'Nyabihu', children: sectors('Jenda', 'Mukamira', 'Rambura') },
      { name: 'Nyamasheke', children: sectors('Kagano', 'Kanjongo', 'Shangi') },
      { name: 'Rubavu', children: sectors('Gisenyi', 'Nyamyumba', 'Rubavu', 'Rugerero') },
      { name: 'Rusizi', children: sectors('Gihundwe', 'Kamembe', 'Nyakabuye') },
      { name: 'Rutsiro', children: sectors('Gihango', 'Kivumu', 'Mushubati') },
    ],
  },
];
