import type { ValueOrPromise } from '../utils';
import type { StructDeserializationContext, StructOptions, StructSerializationContext } from './context';
import { StructFieldDefinition } from './definition';
import type { StructFieldValue } from './field-value';
import type { StructValue } from './struct-value';

describe('StructFieldDefinition', () => {
    describe('.constructor', () => {
        it('should save the `options` parameter', () => {
            class MockFieldDefinition extends StructFieldDefinition<number>{
                constructor(options: number) {
                    super(options);
                }
                getSize(): number {
                    throw new Error('Method not implemented.');
                }
                create(options: Readonly<StructOptions>, context: StructSerializationContext, struct: StructValue, value: unknown): StructFieldValue<this> {
                    throw new Error('Method not implemented.');
                }
                deserialize(options: Readonly<StructOptions>, context: StructDeserializationContext, struct: StructValue): ValueOrPromise<StructFieldValue<this>> {
                    throw new Error('Method not implemented.');
                }
            }

            expect(new MockFieldDefinition(42)).toHaveProperty('options', 42);
        });
    });
});
