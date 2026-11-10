import { checarJanelaHorarioParidade } from '../../scripts/verificar-paridade-biblioteca';

describe('verificar-paridade-biblioteca - checarJanelaHorarioParidade', () => {
  const daytimeHours = [6, 12, 14, 18, 23];
  const nighttimeHours = [0, 1, 3, 5];

  describe('comportamento noturno padrão', () => {
    it.each(nighttimeHours)(
      'libera a execução na janela noturna (%ih BRT) mesmo sem variável',
      (hour) => {
        const resultado = checarJanelaHorarioParidade(hour, undefined);
        expect(resultado.permitido).toBe(true);
        expect(resultado.aviso).toBeUndefined();
      },
    );
  });

  describe('1. variável ausente bloqueia no horário diurno', () => {
    it.each(daytimeHours)(
      'bloqueia no horário diurno (%ih BRT) quando PARIDADE_PERMITIR_DIURNO está ausente',
      (hour) => {
        const resultado = checarJanelaHorarioParidade(hour, undefined);
        expect(resultado.permitido).toBe(false);
        expect(resultado.motivo).toContain('[BLOQUEIO SEÇÃO 3.1]');
        expect(resultado.aviso).toBeUndefined();
      },
    );
  });

  describe('2. valor errado bloqueia no horário diurno', () => {
    const invalidValues = [
      '',
      'true',
      '1',
      'yes',
      'autorizado',
      'autorizado-pelo-dono-extra',
      'AUTORIZADO-PELO-DONO',
    ];

    it.each(invalidValues)(
      'bloqueia no horário diurno (14h BRT) com valor inválido: "%s"',
      (valor) => {
        const resultado = checarJanelaHorarioParidade(14, valor);
        expect(resultado.permitido).toBe(false);
        expect(resultado.motivo).toContain('[BLOQUEIO SEÇÃO 3.1]');
        expect(resultado.aviso).toBeUndefined();
      },
    );
  });

  describe('3. valor exato libera no horário diurno com aviso', () => {
    it.each(daytimeHours)(
      'libera no horário diurno (%ih BRT) apenas com o valor exato "autorizado-pelo-dono"',
      (hour) => {
        const resultado = checarJanelaHorarioParidade(
          hour,
          'autorizado-pelo-dono',
        );
        expect(resultado.permitido).toBe(true);
        expect(resultado.aviso).toContain(
          '[AVISO] Execução diurna liberada excepcionalmente via PARIDADE_PERMITIR_DIURNO=autorizado-pelo-dono',
        );
        expect(resultado.aviso).toContain(`${hour}h BRT`);
      },
    );
  });
});
