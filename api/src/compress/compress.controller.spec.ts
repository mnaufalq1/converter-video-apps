import { Test, TestingModule } from '@nestjs/testing';
import { CompressController } from './compress.controller';

describe('CompressController', () => {
  let controller: CompressController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompressController],
    }).compile();

    controller = module.get<CompressController>(CompressController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
