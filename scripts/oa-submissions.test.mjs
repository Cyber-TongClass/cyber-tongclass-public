import assert from "node:assert/strict";
import test from "node:test";

import {
  getApprovalTimeline,
  getSubmissionTitle,
} from "../src/lib/oa-submissions.ts";

const submittedAt = 10;

test("getSubmissionTitle numbers submissions chronologically even in a newest-first list", () => {
  const first = {
    _id: "submission-a",
    formId: "form-1",
    formTitle: "访客申请",
    submittedAt,
    submitterName: "Alice",
    reviewStatus: "pending",
  };
  const second = {
    ...first,
    _id: "submission-b",
    submittedAt: 20,
  };
  const otherForm = { ...first, _id: "submission-c", formId: "form-2" };

  assert.equal(getSubmissionTitle(second, [second, otherForm, first]), "访客申请的第 2 次提交");
  assert.equal(getSubmissionTitle(first, [second, otherForm, first]), "访客申请的第 1 次提交");
});

test("getSubmissionTitle uses the unnamed-form fallback", () => {
  const submission = {
    _id: "submission-a",
    formId: "form-1",
    submittedAt,
    submitterName: "Alice",
    reviewStatus: "pending",
  };

  assert.equal(getSubmissionTitle(submission, [submission]), "未命名表单的第 1 次提交");
});

for (const [reviewStatus, expectedDetail, expectedTerminalDetail, expectedTerminalState] of [
  ["pending", "等待管理员审核", "等待审核完成", "pending"],
  ["approved", "审核已通过", "审核已通过", "approved"],
  ["rejected", "审核已拒绝", "审核已拒绝", "rejected"],
  ["needs_changes", "需要补充或修改", "需要补充或修改", "needs_changes"],
]) {
  test(`getApprovalTimeline models ${reviewStatus} from submission through completion`, () => {
    const timeline = getApprovalTimeline({
      _id: `submission-${reviewStatus}`,
      formId: "form-1",
      submittedAt,
      submitterName: "Alice",
      reviewStatus,
      reviewerName: "管理员 Bob",
      reviewedAt: 30,
      adminNote: "请注意填写完整信息",
    });

    assert.equal(timeline[0].label, "提交");
    assert.equal(timeline.at(-1).label, "结束");
    assert.equal(timeline[0].actor, "Alice");

    const review = timeline[1];
    assert.equal(review.label, "管理员审核");
    assert.match(review.detail, new RegExp(`^${expectedDetail}`));

    if (reviewStatus === "pending") {
      assert.equal(review.state, "in_progress");
      assert.equal(review.actor, "等待管理员");
      assert.equal(review.timestamp, undefined);
      assert.equal(review.detail, "等待管理员审核");
    } else {
      assert.equal(review.state, reviewStatus);
      assert.equal(review.actor, "管理员 Bob");
      assert.equal(review.timestamp, 30);
      assert.match(review.detail, /请注意填写完整信息/);
    }

    const terminal = timeline.at(-1);
    assert.equal(terminal.state, expectedTerminalState);
    assert.match(terminal.detail, new RegExp(`^${expectedTerminalDetail}`));
  });
}
