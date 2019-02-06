import { mapNested } from "../src/helpers"

test("mapNested", () => {
  const nums: NestedArray<number> = [1, [2, 3, [], 4, [5, 6, [], 7]], [], 8]
  expect(mapNested(nums, x => x + 1)).toEqual([2, 3, 4, 5, 6, 7, 8, 9])
})

test("mapNested empty", () => {
  expect(mapNested([], () => 1)).toEqual([])
})
