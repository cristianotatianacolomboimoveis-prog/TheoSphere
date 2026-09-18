import 'reflect-metadata';
import { RagService } from './rag.service';
import { EvidenceAwareRagService } from './evidence-aware-rag.service';
import { RagModule } from './rag.module';

describe('RagModule production wiring', () => {
  it('binds RagService to EvidenceAwareRagService', () => {
    const providers = Reflect.getMetadata('providers', RagModule) as Array<
      typeof RagService | { provide: unknown; useClass: unknown }
    >;

    const binding = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === RagService,
    );

    expect(binding).toEqual({
      provide: RagService,
      useClass: EvidenceAwareRagService,
    });
  });
});
