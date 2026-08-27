import { Test, TestingModule } from '@nestjs/testing';
import { CompressService } from './compress.service';

describe('CompressService', () => {
  let service: CompressService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompressService],
    }).compile();

    service = module.get<CompressService>(CompressService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
