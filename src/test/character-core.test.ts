import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

type Character = {
  schemaVersion: number;
  identity: { name: string };
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  classes: { name: string; level: number }[];
  hp: { current: number; max: number; log: { type: string; amount: number; before: number; after: number; at: string }[] };
  combat: { armorClass: number; acBonuses: { armor: number }; saves: { fortitude: number; reflex: number; will: number }; saveBonuses: { will: { base: number; magic: number; other: number } } };
};
type Core = {
  CharacterState: Character;
  Store: { state: Character; update: (path: string, value: unknown) => void };
  PersistenceManager: { KEY: string; import: (text: string) => void };
  ThemeManager: { toggle: () => void; KEY: string };
  validateState: (state: unknown) => Character;
  modifier: (score: number) => number;
  calculate: (state: Character) => { ac: number; touch: number; flat: number; saves: Character['combat']['saves']; skills: { total: number }[] };
  setAbility: (key: string, value: number) => boolean;
  applyHP: (type: string, amount: number) => boolean;
};
let core: Core;

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  const source = readFileSync('public/character-sheet.html', 'utf8');
  document.documentElement.innerHTML = source.replace(/<!DOCTYPE html>/i, '').replace(/<\/?html[^>]*>/g, '');
  const script = document.querySelector('script')?.textContent;
  if (!script) throw new Error('Standalone core script missing');
  new Function(script)();
  core = (window as unknown as { CharacterChronicle: Core }).CharacterChronicle;
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('Standalone character foundation', () => {
  it('seeds the requested four classes and levels', () => {
    expect(core.Store.state.classes).toEqual([
      { name: 'Monk', level: 9 }, { name: 'Tattooed', level: 11 },
      { name: 'Shintao', level: 4 }, { name: 'Shaolin', level: 8 },
    ]);
  });
  it('debounces automatic saves for exactly 300 milliseconds', () => {
    core.Store.update('identity.name', 'Arin');
    vi.advanceTimersByTime(299);
    expect(localStorage.getItem(core.PersistenceManager.KEY)).toBeNull();
    vi.advanceTimersByTime(1);
    expect(JSON.parse(localStorage.getItem(core.PersistenceManager.KEY) ?? '{}').identity.name).toBe('Arin');
  });
  it('resets the 300ms deadline on rapid changes', () => {
    core.Store.update('identity.name', 'A');
    vi.advanceTimersByTime(200);
    core.Store.update('identity.name', 'Arin');
    vi.advanceTimersByTime(299);
    expect(localStorage.getItem(core.PersistenceManager.KEY)).toBeNull();
    vi.advanceTimersByTime(1);
    expect(localStorage.getItem(core.PersistenceManager.KEY)).toContain('Arin');
  });
  it('imports a valid complete character', () => {
    const state = structuredClone(core.CharacterState);
    state.identity.name = 'Imported Saint';
    core.PersistenceManager.import(JSON.stringify(state));
    expect(core.Store.state.identity.name).toBe('Imported Saint');
  });
  it('rejects incomplete JSON without changing the current character', () => {
    expect(() => core.PersistenceManager.import('{"identity":{"name":"Bad"}}')).toThrow();
    expect(core.Store.state.identity.name).toBe('O Santo');
  });
  it('rejects invalid numeric values before merging', () => {
    const state = structuredClone(core.CharacterState);
    state.abilities.str = -1;
    expect(() => core.validateState(state)).toThrow();
    expect(core.Store.state.abilities.str).toBe(18);
  });
  it('strips unknown imported keys rather than merging them', () => {
    const state = { ...structuredClone(core.CharacterState), unexpected: 'discard' };
    expect(core.validateState(state)).not.toHaveProperty('unexpected');
  });
  it('persists the selected light theme locally', () => {
    core.ThemeManager.toggle();
    expect(localStorage.getItem(core.ThemeManager.KEY)).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });
});

describe('Passo 2 — regras de atributos e combate', () => {
  it('inicia os seis atributos com os valores solicitados', () => {
    expect(core.Store.state.abilities).toEqual({ str: 18, dex: 26, con: 20, int: 18, wis: 48, cha: 28 });
  });
  it.each([[18, 4], [26, 8], [20, 5], [48, 19], [28, 9], [9, -1], [11, 0]])('calcula o modificador de %i como %i', (score, expected) => {
    expect(core.modifier(score)).toBe(expected);
  });
  it('inicia CA 110, Toque 86 e Surpresa 102', () => {
    expect(core.calculate(core.Store.state)).toMatchObject({ ac: 110, touch: 86, flat: 102 });
  });
  it('inicia Fortitude +24, Reflexos +27 e Vontade +38', () => {
    expect(core.Store.state.combat.saves).toEqual({ fortitude: 24, reflex: 27, will: 38 });
  });
  it('propaga SAB 50 imediatamente para CA, Vontade e perícias', () => {
    core.setAbility('wis', 50);
    expect(core.Store.state.combat.armorClass).toBe(111);
    expect(core.Store.state.combat.saves.will).toBe(39);
    expect(core.calculate(core.Store.state)).toMatchObject({ touch: 87, flat: 103 });
    expect(core.calculate(core.Store.state).skills.map(s => s.total)).toEqual([20, 20, 20]);
  });
  it('propaga DES para CA e Reflexos, sem aumentar CA Surpresa', () => {
    core.setAbility('dex', 28);
    expect(core.calculate(core.Store.state)).toMatchObject({ ac: 111, touch: 87, flat: 102, saves: { reflex: 28 } });
  });
  it('não remove penalidades de Destreza da CA Surpresa', () => {
    core.setAbility('dex', 8);
    expect(core.calculate(core.Store.state)).toMatchObject({ ac: 101, touch: 77, flat: 101 });
  });
  it('propaga CON 22 para Fortitude +25', () => {
    core.setAbility('con', 22);
    expect(core.Store.state.combat.saves.fortitude).toBe(25);
  });
  it('soma Base + Mod Atributo + Mágico + Outros', () => {
    core.Store.update('combat.saveBonuses.will.base', 10);
    core.Store.update('combat.saveBonuses.will.magic', 4);
    core.Store.update('combat.saveBonuses.will.other', 2);
    expect(core.Store.state.combat.saves.will).toBe(35);
  });
  it('armadura aumenta CA total e surpresa, mas não CA Toque', () => {
    core.Store.update('combat.acBonuses.armor', 17);
    expect(core.calculate(core.Store.state)).toMatchObject({ ac: 111, touch: 86, flat: 103 });
  });
  it('inicia PV em 408 atuais de 416 máximos', () => {
    expect(core.Store.state.hp).toMatchObject({ current: 408, max: 416, log: [] });
  });
  it('aplica dano e registra o valor real de PV perdido', () => {
    expect(core.applyHP('damage', 20)).toBe(true);
    expect(core.Store.state.hp.current).toBe(388);
    expect(core.Store.state.hp.log[0]).toMatchObject({ type: 'damage', amount: 20, before: 408, after: 388 });
  });
  it('limita a cura aos 416 PV máximos e registra apenas a cura efetiva', () => {
    core.applyHP('heal', 20);
    expect(core.Store.state.hp.current).toBe(416);
    expect(core.Store.state.hp.log[0]).toMatchObject({ type: 'heal', amount: 8, before: 408, after: 416 });
  });
  it('limita dano a zero PV sem produzir vida negativa', () => {
    core.applyHP('damage', 500);
    expect(core.Store.state.hp.current).toBe(0);
    expect(core.Store.state.hp.log[0]).toMatchObject({ amount: 408, after: 0 });
  });
  it.each([0, -1, 1.5, NaN, Infinity])('rejeita dano ou cura inválidos: %s', amount => {
    expect(core.applyHP('damage', amount)).toBe(false);
    expect(core.applyHP('heal', amount)).toBe(false);
    expect(core.Store.state.hp.current).toBe(408);
    expect(core.Store.state.hp.log).toEqual([]);
  });
  it('mantém histórico e bônus após exportação e importação JSON', () => {
    core.applyHP('damage', 8);
    core.setAbility('wis', 50);
    const exported = JSON.stringify(core.Store.state);
    core.PersistenceManager.import(exported);
    expect(core.Store.state.hp.current).toBe(400);
    expect(core.Store.state.hp.log[0]).toMatchObject({ type: 'damage', amount: 8 });
    expect(core.Store.state.combat.saves.will).toBe(39);
  });
  it('rejeita eventos de histórico inconsistentes antes de importar', () => {
    const state = structuredClone(core.CharacterState);
    state.hp.log = [{ type: 'damage', amount: 99, before: 408, after: 400, at: new Date().toISOString() }];
    expect(() => core.validateState(state)).toThrow();
    expect(core.Store.state.hp.current).toBe(408);
  });
  it('atualiza o salvamento inicial do Passo 1 sem perder nome e classes', () => {
    const old = { ...structuredClone(core.CharacterState), schemaVersion: 1,
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      combat: { armorClass: 10, initiative: 0, speed: 30, baseAttackBonus: 0, saves: { fortitude: 0, reflex: 0, will: 0 } },
      hp: { current: 0, max: 0, temporary: 0, log: [] }, skills: [] };
    old.identity.name = 'Meu personagem';
    core.PersistenceManager.import(JSON.stringify(old));
    expect(core.Store.state.schemaVersion).toBe(2);
    expect(core.Store.state.identity.name).toBe('Meu personagem');
    expect(core.Store.state.abilities.wis).toBe(48);
    expect(core.Store.state.hp.current).toBe(408);
    expect(core.Store.state.classes).toEqual(old.classes);
  });
});