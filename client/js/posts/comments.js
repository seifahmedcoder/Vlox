import templates from "@vlox/templates.js";
import CommentEditor from "@vlox/posts/comment-editor.js";
import {
    sendRequest,
    capitalize,
    lockEvent,
    config,
    quickInfo,
    $,
    Alert,
    Swal
} from "@vlox/utils.js";

async function getComments(state = {}) {
    return await sendRequest({
        url: `/api/v1/posts/${state.id}/comments/?skip=${state.skip}`
    });
}

async function renderComments(state = {}, preFetchedResponse = null) {
    const response = preFetchedResponse || await getComments(state);
    if (response && !response.success) return Alert.error({ text: response.error });

    // Clear container
    $(state.container).empty();

    // No data
    if (!Array.isArray(response?.comments) || response.comments.length <= 0) {
        $("<div>")
            .addClass("state-nothing-found")
            .html("<b>No comments yet.</b>")
            .appendTo(state.container);
        return;
    }

    // Render data
    const fragment = new DocumentFragment();

    response.comments.forEach(comment => {
        const safeComment = comment || {};
        const safeBy = safeComment.by || {};
        const card = $("<div>").addClass("card").appendTo(fragment);

        // Header
        const header = $("<div>").addClass("space-between").appendTo(card);

        $("<h3>")
            .addClass("overflow")
            .text(capitalize(safeBy.username) || "User")
            .appendTo(header);

        if (safeBy?._id && safeBy._id === quickInfo?._id) {
            const buttons = $("<div>").addClass("center").appendTo(header);

            $("<i>")
                .addClass("fas fa-pen-to-square icon-helper")
                .attr({ role: "button", tabindex: "0" })
                .on("click", lockEvent(async function () {
                    const instance = new CommentEditor("Edit comment", safeComment.content);
                    const result = await instance.open();
                    if (!result.isConfirmed) return;

                    // Send request
                    const response = await sendRequest({
                        url: `/api/v1/comments/${safeComment._id}/update`,
                        method: "PUT",
                        body: {
                            content: result.value
                        }
                    });

                    if (!response.success) return Alert.error({ text: response.error });
                    if (!response.changed) return Alert.info({ text: "No changes were made!" });

                    Alert.success({ text: "Comment updated!" });
                }))
                .appendTo(buttons);

            $("<i>")
                .addClass("fas fa-trash icon-helper")
                .attr({ role: "button", tabindex: "0" })
                .on("click", lockEvent(async function () {
                    const response = await sendRequest({
                        url: `/api/v1/comments/${safeComment._id}/delete`,
                        method: "DELETE"
                    });

                    if (!response.success) return Alert.error({ text: response.error });
                    Alert.success({ text: "Comment deleted!" });
                }))
                .appendTo(buttons);
        }

        /// Content
        $("<p>")
            .text(safeComment.content || "No content found")
            .appendTo(card);

        // Edited badge
        if (safeComment.editedAt) {
            $("<small>")
                .text("(Edited)")
                .css("color", "gray")
                .appendTo(card);
        }
    });

    $(state.container).append(fragment);
}

export default async function showComments(id) {
    const state = { id, skip: 0, container: null };
    const response = await getComments(state);
    if (!response.success) return Alert.error({ text: response.error });

    Swal.fire({
        title: "Comments",
        html: templates.POST_COMMENTS(),
        stopKeydownPropagation: false,
        confirmButtonText: "Close",
        didOpen: () => {
            const $popup = $(Swal.getPopup());
            state.container = $popup.find("#comments-container");

            $popup.find("#comments-prev-btn").on("click", lockEvent(async function () {
                if (state.skip <= 0) return;
                state.skip -= config.COMMENTS_LIMIT;
                await renderComments(state);
            }));

            $popup.find("#comments-next-btn").on("click", lockEvent(async function () {
                if ($(state.container).find(".state-nothing-found").length) return;
                state.skip += config.COMMENTS_LIMIT;
                await renderComments(state);
            }));

            renderComments(state, response);
        }
    });
}