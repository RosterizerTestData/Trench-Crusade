let formatText = (text) => {
  return text?.replace(/"/g,'″').replace(/'/g,'’').replace(/■ /g,'\n* ').replace(/\.\.\./g,'…').replace(/\n/g,'\n\n');
}
let numberr = function(input){
  if(typeof input === 'number') return input
  let inputnum = Number(input);
  if(inputnum == input) return inputnum
  return null
}
let titleCase = function(sentence){
  return sentence.replace(/^\s*(.*[^\s])*\s*$/,'$1').replace(/\s+/g,' ').toLowerCase().split(' ').map(word => word[0].toUpperCase() + word.slice(1)).join(' ').replace(/ Of /g,' of ').replace(/ The /g,' the ').replace(/ With /g,' with ').replace(/ In /g,' in ').replace(/ On /g,' on ')
}

const fileList = [
  'tc_data.json',
];
async function processFiles() {
  for (const file of fileList) {
    try {
      const response = await fetch(file);
      const data = await response.json();

      console.log(data);
      let combinedData = {};
      Object.keys(data).forEach(classification => {
        data[classification].forEach(item => {
          combinedData[item.id] = {...item,classification: classification};
        })
      });
      console.log(combinedData);
      let rulebook = {
        name: "Trench Crusade",
        revision: "0.3.0",
        game: "Trench Crusade",
        genre: "fantasy",
        publisher: "",
        url: "https://www.trenchcrusade.com/",
        notes: "",
        wip: true,
        rulebook: {
          assetTaxonomy: {},
          assetCatalog: {
          },
          gameModes: {},
          theme: {}
        }
      };

      let mdList = {};

      data.Model.forEach(md => {
        mdList[md.id] = {
          ...md,
          costs:{},
          traits: Array.from(new Set([...(md.abilities?.map(a => a.content) || []),...(md.equipment?.map(a => a.content) || []),...(md.attachments?.map(a => a.val) || [])])),
        };
      });

      let eqList = {};

      data.Equipment.forEach(eq => {
        eqList[eq.id] = {...eq,costs:{}};
      });

      data.Faction.forEach(faction => {
        faction.models.forEach(md => {
          let costKey = md.cost + ' ' + titleCase(md.cost_id);
          mdList[md.id].costs[costKey] = mdList[md.id].costs[costKey] || [];
          mdList[md.id].costs[costKey].push(faction.name);
          if(md.limit_max) mdList[md.id].max = md.limit_max;
        });
        faction.equipment.forEach(eq => {
          let costKey = eq.cost + ' ' + titleCase(eq.cost_id);
          eqList[eq.id].costs[costKey] = eqList[eq.id].costs[costKey] || [];
          eqList[eq.id].costs[costKey].push(faction.name);
        });
      });
      data.Variant.forEach(faction => {
        faction.models.forEach(md => {
          let costKey = md.cost + ' ' + titleCase(md.cost_id);
          mdList[md.id].costs[costKey] = mdList[md.id].costs[costKey] || [];
          mdList[md.id].costs[costKey].push(faction.name);
          if(!mdList[md.id].max && md.limit_max) mdList[md.id].max = md.limit_max;
        });
        faction.equipment.forEach(eq => {
          let costKey = eq.cost + ' ' + titleCase(eq.cost_id);
          eqList[eq.id].costs[costKey] = eqList[eq.id].costs[costKey] || [];
          eqList[eq.id].costs[costKey].push(faction.name);
        });
      });

      Object.entries(mdList).forEach(([key, md]) => {
        let mdItem = {
          "assets": {
            "traits": []
          },
          "keywords": {
          },
          "stats": {
          }
        };
        let factionName = data.Faction.find(f => f.id == md.faction_id)?.name;
        if(factionName) mdItem.keywords.Faction = [factionName];
        if(factionName) mdItem.keywords.Tags = [factionName + ' model'];
        if(!factionName) mdItem.keywords.Faction = ['Mercenaries'];
        mdItem.keywords.Keywords = md.tags.filter(t => !['elite','leader','newantioch','blackgrail','heretic'].includes(t.tag_name) && t.tag_name.toLowerCase().replace(/ /g,'') !== factionName?.toLowerCase()?.replace(/ /g,'')).map(t => titleCase(t.tag_name));
        if(md.tags.filter(t => t.tag_name === 'elite').length > 0) mdItem.keywords.Type = ['Elite'];
        if(md.tags.filter(t => t.tag_name === 'leader').length > 0) mdItem.keywords.Type = ['Leader'];
        if(!mdItem.keywords.Keywords.length) delete mdItem.keywords.Keywords;
        if(!Object.keys(mdItem.keywords).length) delete mdItem.keywords;
        if(md.hasOwnProperty('armour')){
          mdItem.stats.Armour = {value: numberr(md.armour)};
          if(typeof mdItem.stats.Armour.value !== 'number') mdItem.stats.Armour.statType = 'term';
        }
        if(md.hasOwnProperty('base')){
          mdItem.stats.Base = {value: numberr(md.base)};
          if(typeof mdItem.stats.Base.value !== 'number') mdItem.stats.Base.statType = 'term';
        }
        if(md.hasOwnProperty('movement')){
          mdItem.stats.Movement = {value: numberr(md.movement)};
          if(typeof mdItem.stats.Movement.value !== 'number') mdItem.stats.Movement.statType = 'term';
        }
        if(md.hasOwnProperty('melee')){
          mdItem.stats.Melee = {value: numberr(md.melee) !== null ? numberr(md.melee) : md.melee};
          if(typeof mdItem.stats.Melee.value !== 'number') mdItem.stats.Melee.statType = 'term';
        }
        if(md.hasOwnProperty('ranged')){
          mdItem.stats.Ranged = {value: numberr(md.ranged) !== null ? numberr(md.ranged) : md.ranged};
          if(typeof mdItem.stats.Ranged.value !== 'number') mdItem.stats.Ranged.statType = 'term';
        }
        if(md.hasOwnProperty('max')){
          if(md.max === 1) mdItem.aspects = {Unique: true};
          mdItem.stats.MaxQty = {value: md.max};
        }
        let [costValue,costType] = Object.keys(md.costs)[0].split(' ');
        mdItem.stats[costType] = {
          value: Number(costValue),
        }
        md.traits.forEach(t => {
          if(combinedData.hasOwnProperty(t)) mdItem.assets.traits.push(combinedData[t].classification + '§' + combinedData[t].name);
          else mdItem.text = mdItem.text ? mdItem.text + '\n' + t : t;
        });

        rulebook.rulebook.assetCatalog['Model§' + md.name.trim()] = mdItem;
      });

      Object.entries(eqList).forEach(([key, eq]) => {
        let eqItem = {
          aspects: {Label: eq.name},
          keywords: {
            Tags: [
            ]
          },
          stats: {
          }
        }
        if(eq.name.toLowerCase().includes('pistol')) eqItem.keywords.Tags.push('Pistol');
        if(!eq.name.toLowerCase().includes('pistol') && eq.category === 'ranged') eqItem.keywords.Tags.push('Non-pistol');
        if(eq.name.toLowerCase().includes('rifle')) eqItem.keywords.Tags.push('Rifle');

        if(eq.range && eq.range !== 'Melee'){
          let repl = eq.range;
          if(Number(repl) != repl) eqItem.stats.Range = {value: repl,statType: 'term'};
          eqItem.stats.Range = {value: Number(repl)};
        }
        if(eq.equip_type) eqItem.stats.Type = {value: eq.equip_type};
        if(eq.description.length) eqItem.text = formatText(eq.description[0].subcontent[0].content.trim());
        if(eq.modifiers?.length) eqItem.stats.Modifiers = {value: eq.modifiers[0]};
        if(eq.tags?.length){
          eqItem.assets = {};
          eqItem.assets.traits = eq.tags.map(tag => 'Ability§' + titleCase(tag.tag_name));
        }

        Object.entries(eq.costs).forEach(([cost, factions]) => {
          let eqCostedItem = JSON.parse(JSON.stringify(eqItem));
          let [costValue,costType] = cost.split(' ');
          eqCostedItem.stats[costType] = {
            value: Number(costValue),
          }
          eqCostedItem.keywords.Tags.push(...factions);

          let costedName = '';
          if(eq.category === 'equipment') costedName = 'Equipment';
          else if(eq.category === 'armour') costedName = 'Armour';
          else if(eq.category === 'melee') costedName = 'Melee Weapon';
          else if(eq.category === 'ranged') costedName = 'Ranged Weapon';
          costedName += '§' + titleCase(eq.name) + '—' + cost;
          rulebook.rulebook.assetCatalog[costedName] = eqCostedItem;
        });
      });

      data.Ability.forEach(addon => {
        rulebook.rulebook.assetCatalog['Ability§'+addon.name] = {
          text: formatText(addon.description[0].content.trim())
        };
      });
      
      console.log(rulebook.rulebook);
      // console.log(JSON.stringify(rulebook).length,rulebook);
    } catch (error) {
      // Handle any error that occurs during loading
      console.error(error);
    }
  }
}

processFiles();
