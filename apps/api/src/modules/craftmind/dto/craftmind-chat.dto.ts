import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CraftmindHistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(1500)
  content!: string;
}

export class CraftmindChatDto {
  @IsString()
  @MaxLength(1500)
  prompt!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => CraftmindHistoryMessageDto)
  history?: CraftmindHistoryMessageDto[];
}
