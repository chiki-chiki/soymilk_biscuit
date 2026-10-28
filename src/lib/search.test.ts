import { describe, expect, it } from "vitest";
import { matchesKeyword, normalizeForSearch, shortName } from "./search";

describe("normalizeForSearch", () => {
  it("カタカナ・半角カナ・全角英数を揃える", () => {
    expect(normalizeForSearch("マッチャ")).toBe("まっちゃ");
    expect(normalizeForSearch("ﾏｯﾁｬ")).toBe("まっちゃ");
    expect(normalizeForSearch("ＣＯＣＯＡ ミルク")).toBe("cocoaみるく");
  });
});

describe("matchesKeyword", () => {
  it("すべての語が含まれれば一致", () => {
    expect(matchesKeyword("まっちゃ", ["抹茶", "まっちゃ"])).toBe(true);
    expect(matchesKeyword("マッチャ 黒蜜", ["抹茶黒蜜", "まっちゃくろみつ"])).toBe(true);
    expect(matchesKeyword("ココア", ["抹茶", "まっちゃ"])).toBe(false);
  });
  it("空のキーワードはすべてに一致", () => {
    expect(matchesKeyword("  ", ["何でも"])).toBe(true);
  });
});

describe("shortName", () => {
  it("「豆乳ビスケット 〇〇」の共通部分を省く", () => {
    expect(shortName("豆乳ビスケット いちご")).toBe("いちご");
    expect(shortName("豆乳ビスケット アソートパック")).toBe("アソートパック");
  });
  it("それ以外の名前はそのまま", () => {
    expect(shortName("オリジナル 豆乳ビスケット缶")).toBe("オリジナル 豆乳ビスケット缶");
    expect(shortName("豆乳サンドビスケット")).toBe("豆乳サンドビスケット");
    expect(shortName("塩バニラ")).toBe("塩バニラ");
  });
});
