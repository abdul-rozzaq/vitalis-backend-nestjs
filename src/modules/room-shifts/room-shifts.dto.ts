import { IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class CreateRoomShiftDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  @Max(23)
  startHour: number;

  @IsInt()
  @Min(1)
  @Max(24)
  endHour: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  startMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  endMinute?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  roundHour?: number;

  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  nurseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  roomIds?: string[];
}

export class UpdateRoomShiftDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  startHour?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  endHour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  startMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  endMinute?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  roundHour?: number;

  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  nurseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  roomIds?: string[];
}

export class RoomShiftAddRoomDto {
  @IsUUID()
  roomId: string;
}
