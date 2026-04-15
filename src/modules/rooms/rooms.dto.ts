import { IsString, IsInt, IsPositive, IsOptional, IsEnum, MinLength, MaxLength } from "class-validator";

export enum RoomType {
  WARD = "WARD",
  EXAMINATION = "EXAMINATION",
}

export class CreateRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(RoomType)
  roomType: RoomType;
}

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(RoomType)
  roomType?: RoomType;
}
