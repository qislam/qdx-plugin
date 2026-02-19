import { firstNames, lastNames } from './data/nameData.js';
import { streetNames } from './data/streetData.js';
import { cityNames } from './data/cityData.js';
import { stateNames } from './data/statesData.js';
import { loremIpsum, polishWords, spanishWords, englishWords, urduWords } from './data/wordData.js';
import { looseObject } from './interfaces.js';
import randomatic from 'randomatic';

const random: looseObject = {
  find(names: string[]) {
    return names[~~(Math.random() * names.length)].split(' ').map(this.capitalize).join(' ');
  },
  capitalize(name: string) {
    if (name.length < 2) return name.toUpperCase();
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  },
  getString(pattern: string = 'a', length: number = ~~(Math.random() * 9) + 3) {
    return randomatic(pattern, length);
  },
  getDate(min: number = -365 * 21, max: number = -365 * 65) {
    const count = ~~(Math.random() * max) + min;
    const now = Date.now();
    const result = new Date(now + count * 24 * 60 * 60 * 1000);
    return result.toJSON();
  },
  get date() {
    return this.getDate();
  },
  get lastWeek() {
    return this.getDate(-1, -8);
  },
  get lastMonth() {
    return this.getDate(-1, -31);
  },
  get lastYear() {
    return this.getDate(-1, -366);
  },
  get nextWeek() {
    return this.getDate(1, 8);
  },
  get nextMonth() {
    return this.getDate(1, 31);
  },
  get nextYear() {
    return this.getDate(1, 366);
  },
  get useRealWords() {
    if (this._useRealWords) return this._useRealWords;
    else return false;
  },
  set useRealWords(value) {
    this._useRealWords = value;
  },
  get language() {
    if (this._language) return this._language;
    else return null;
  },
  set language(value) {
    this._language = value;
  },
  get string() {
    return this.getString();
  },
  get word() {
    if (this.language === 'spanish') {
      return spanishWords[~~(Math.random() * spanishWords.length)];
    } else if (this.language === 'polish') {
      return polishWords[~~(Math.random() * polishWords.length)];
    } else if (this.language === 'english') {
      return englishWords[~~(Math.random() * englishWords.length)];
    } else if (this.language === 'urdu') {
      return urduWords[~~(Math.random() * urduWords.length)];
    } else {
      return loremIpsum[~~(Math.random() * loremIpsum.length)];
    }
  },
  get sentence() {
    let sentence = this.capitalize(this.word);
    const count = ~~(Math.random() * 5) + 3;
    for (let i = 0; i < count; i++) {
      sentence += ' ' + this.word;
    }
    return sentence + '. ';
  },
  get paragraph() {
    let para = this.sentence;
    const count = ~~(Math.random() * 5) + 3;
    for (let i = 0; i < count; i++) {
      para += this.sentence;
    }
    return para;
  },
  get firstName() {
    return this.find(firstNames);
  },
  get lastName() {
    return this.find(lastNames);
  },
  get street() {
    return this.find(streetNames);
  },
  get city() {
    return this.find(cityNames);
  },
  get state() {
    return this.find(stateNames).toUpperCase();
  },
  get person() {
    const p: looseObject = {};
    p.firstName = this.firstName;
    p.lastName = this.lastName;
    p.birthdate = this.date;
    p.ssn = `${randomatic('000')}-${randomatic('00')}-${randomatic('0000')}`;
    p.phone = `(${randomatic('000')}) ${randomatic('000')}-${randomatic('0000')}`;
    p.email = `${p.firstName.toLowerCase()}.${p.lastName.toLowerCase()}@${randomatic('a', 8)}.com`;
    p.street = randomatic('0', 4) + ' ' + this.street;
    p.city = this.city;
    p.state = this.state;
    p.zip = randomatic('0', 5);
    return p;
  },
};

export { random };
