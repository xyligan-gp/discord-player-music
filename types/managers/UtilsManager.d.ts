import { Player } from "../Player";

import { PlayerOptions } from "../PlayerOptions";

export declare class UtilsManager {
  constructor(player: Player);

  /**
   * Player Class
   */
  private player: Player;

  /**
   * Allows you to format numbers in a familiar form for people
   * @param data Numbers Array
   *
   * @returns Returns an array of formatted numbers
   */
  public formatNumbers(data: number[]): string[];

  /**
   * Allows you to format the duration to the usual form
   *
   * @param value Duration value
   *
   * @returns Formatted duration value
   */
  public formatDuration(value: number): string;

  /**
   * Method for checking module options
   *
   * @param options Module options
   *
   * @returns Correct module options
   */
  public checkOptions(options?: PlayerOptions): PlayerOptions;

  /**
   * Allows you to create an empty progress bar
   *
   * @returns Empty progress bar
   */
  public createEmptyProgress(): string;

  /**
   * Allows you to get a unique ID
   *
   * @returns Unique ID
   */
  public getUniqueID(): string;

  /**
   * Allows you to find out the duration of the track
   *
   * @param url Track url
   *
   * @returns Track duration
   */
  public getTrackDuration(url: string): Promise<number>;
}
