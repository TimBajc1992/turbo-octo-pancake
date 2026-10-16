"""Regressions for the actual shipped plist, without access to Health data.

The conditional envelope follows an Apple-exported Activity Report and
https://github.com/viticci/shortcuts-playground-plugin/blob/main/codex/skills/shortcuts-playground/CONTROL_FLOW.md
This checks serialization, not execution or Health permissions on an iPhone.
"""
import pathlib
import plistlib
import unittest
import zipfile


class HealthShortcutTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        bundle = pathlib.Path(__file__).resolve().parents[1] / "public/shortcuts/TEZISCE-Apple-Health.zip"
        with zipfile.ZipFile(bundle) as archive:
            workflow = plistlib.loads(archive.read("TEZISCE-Apple-Health/TEZISCE-Apple-Health.unsigned.shortcut"))
        cls.actions = workflow["WFWorkflowActions"]
        cls.by_id = {a["WFWorkflowActionParameters"]["UUID"]: a for a in cls.actions}
        cls.conditions = [a["WFWorkflowActionParameters"] for a in cls.actions
                          if a["WFWorkflowActionIdentifier"] == "is.workflow.actions.conditional"
                          and a["WFWorkflowActionParameters"]["WFControlFlowMode"] == 0]

    def test_each_condition_has_an_editor_visible_count_input(self):
        self.assertEqual(len(self.conditions), 3)
        count_ids = set()
        for condition in self.conditions:
            with self.subTest(group=condition["GroupingIdentifier"]):
                entry = condition["WFInput"]
                # A bare WFTextTokenAttachment was silently discarded on import.
                self.assertEqual(entry.get("Type"), "Variable")
                attachment = entry["Variable"]
                self.assertEqual(attachment["WFSerializationType"], "WFTextTokenAttachment")
                reference = attachment["Value"]
                self.assertEqual(reference["Type"], "ActionOutput")
                count = self.by_id[reference["OutputUUID"]]
                self.assertEqual(count["WFWorkflowActionIdentifier"], "is.workflow.actions.count")
                count_ids.add(reference["OutputUUID"])
        self.assertEqual(len(count_ids), 3, "Each Health query needs its own count")

    def test_missing_samples_are_guarded_and_blocks_are_closed(self):
        for index, condition in enumerate(self.conditions):
            with self.subTest(index=index):
                self.assertEqual(condition["WFCondition"], 2)  # greater than
                self.assertEqual(condition["WFNumberValue"], 0)
                modes = [a["WFWorkflowActionParameters"]["WFControlFlowMode"]
                         for a in self.actions
                         if a["WFWorkflowActionParameters"].get("GroupingIdentifier") == condition["GroupingIdentifier"]]
                self.assertEqual(modes, [0, 1, 2] if index == 0 else [0, 2])


if __name__ == "__main__":
    unittest.main()
