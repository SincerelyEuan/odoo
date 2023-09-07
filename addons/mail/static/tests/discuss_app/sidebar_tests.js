/* @odoo-module */

import { Command } from "@mail/../tests/helpers/command";
import { click, contains, insertText, start, startServer } from "@mail/../tests/helpers/test_utils";

import { getOrigin } from "@web/core/utils/urls";

QUnit.module("discuss sidebar");

QUnit.test("toggling category button hide category items", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({
        name: "general",
        channel_type: "channel",
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains("button.o-active", { text: "Inbox" });
    await contains(".o-mail-DiscussSidebarChannel");

    await click(".o-mail-DiscussSidebarCategory-icon:eq(0)");
    await contains(".o-mail-DiscussSidebarChannel", { count: 0 });
});

QUnit.test("toggling category button does not hide active category items", async () => {
    const pyEnv = await startServer();
    const [channelId] = pyEnv["discuss.channel"].create([
        { name: "abc", channel_type: "channel" },
        { name: "def", channel_type: "channel" },
    ]);
    const { openDiscuss } = await start();
    openDiscuss(channelId);
    await contains(".o-mail-DiscussSidebarChannel", { count: 2 });
    await contains(".o-mail-DiscussSidebarChannel.o-active");

    await click(".o-mail-DiscussSidebarCategory-icon:eq(0)");
    await contains(".o-mail-DiscussSidebarChannel");
    await contains(".o-mail-DiscussSidebarChannel.o-active");
});

QUnit.test("Closing a category sends the updated user setting to the server.", async (assert) => {
    const { openDiscuss } = await start({
        mockRPC(route, args) {
            if (route === "/web/dataset/call_kw/res.users.settings/set_res_users_settings") {
                assert.step(route);
                assert.strictEqual(
                    args.kwargs.new_settings.is_discuss_sidebar_category_channel_open,
                    false
                );
            }
        },
    });
    openDiscuss();
    await click(".o-mail-DiscussSidebarCategory-icon:eq(0)");
    assert.verifySteps(["/web/dataset/call_kw/res.users.settings/set_res_users_settings"]);
});

QUnit.test("Opening a category sends the updated user setting to the server.", async (assert) => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    const { openDiscuss } = await start({
        mockRPC(route, args) {
            if (route === "/web/dataset/call_kw/res.users.settings/set_res_users_settings") {
                assert.step(route);
                assert.strictEqual(
                    args.kwargs.new_settings.is_discuss_sidebar_category_channel_open,
                    true
                );
            }
        },
    });
    openDiscuss();
    await click(".o-mail-DiscussSidebarCategory-icon:eq(0)");
    assert.verifySteps(["/web/dataset/call_kw/res.users.settings/set_res_users_settings"]);
});

QUnit.test("channel - command: should have view command when category is unfolded", async () => {
    const { openDiscuss } = await start();
    openDiscuss();
    await contains("i[title='View or join channels']");
});

QUnit.test("channel - command: should have view command when category is folded", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await click(".o-mail-DiscussSidebarCategory-channel span", { text: "Channels" });
    await contains("i[title='View or join channels']");
});

QUnit.test("channel - command: should have add command when category is unfolded", async () => {
    const { openDiscuss } = await start();
    openDiscuss();
    await contains("i[title='Add or join a channel']");
});

QUnit.test("channel - command: should not have add command when category is folded", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory", { text: "Channels" });
    await contains("i[title='Add or join a channel']", { count: 0 });
});

QUnit.test("channel - states: close manually by clicking the title", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "general" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: true,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel span", { text: "general" });
    await click(".o-mail-DiscussSidebarCategory-channel span", { text: "Channels" });
    await contains(".o-mail-DiscussSidebarChannel span", { count: 0, text: "general" });
});

QUnit.test("channel - states: open manually by clicking the title", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "general" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory-channel span", { text: "Channels" });
    await contains(".o-mail-DiscussSidebarChannel span", { count: 0, text: "general" });

    await click(".o-mail-DiscussSidebarCategory-channel span", { text: "Channels" });
    await contains(".o-mail-DiscussSidebarChannel span", { text: "general" });
});

QUnit.test("sidebar: inbox with counter", async () => {
    const pyEnv = await startServer();
    pyEnv["mail.notification"].create({
        notification_type: "inbox",
        res_partner_id: pyEnv.currentPartnerId,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains("button:contains(Inbox) .badge", { text: "1" });
});

QUnit.test("default thread rendering", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "General" });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains("button div", { text: "Inbox" });
    await contains("button div", { text: "Starred" });
    await contains("button div", { text: "History" });
    await contains(".o-mail-DiscussSidebarChannel span", { text: "General" });
    await contains("button:contains(Inbox).o-active");
    await contains(
        ".o-mail-Thread:contains(Congratulations, your inbox is empty  New messages appear here.)"
    );

    await click("button", { text: "Starred" });
    await contains("button:contains(Starred).o-active");
    await contains(
        ".o-mail-Thread:contains(No starred messages  You can mark any message as 'starred', and it shows up in this mailbox.)"
    );

    await click("button div", { text: "History" });
    await contains("button:contains(History).o-active");
    await contains(
        ".o-mail-Thread:contains(No history messages  Messages marked as read will appear in the history.)"
    );

    await click(".o-mail-DiscussSidebarChannel span", { text: "General" });
    await contains(".o-mail-DiscussSidebarChannel:contains(General).o-active");
    await contains(".o-mail-Thread .o-mail-Thread-empty", {
        text: "There are no messages in this conversation.",
    });
});

QUnit.test("sidebar quick search at 20 or more pinned channels", async () => {
    const pyEnv = await startServer();
    for (let id = 1; id <= 20; id++) {
        pyEnv["discuss.channel"].create({ name: `channel${id}` });
    }
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel span", { count: 20 });
    await contains(".o-mail-DiscussSidebar input[placeholder='Quick search...']");

    await insertText(".o-mail-DiscussSidebar input[placeholder='Quick search...']", "1");
    await contains(".o-mail-DiscussSidebarChannel span", { count: 11 });

    await insertText(".o-mail-DiscussSidebar input[placeholder='Quick search...']", "12", {
        replace: true,
    });
    await contains(".o-mail-DiscussSidebarChannel");
    await contains(".o-mail-DiscussSidebarChannel span", { text: "channel12" });

    await insertText(".o-mail-DiscussSidebar input[placeholder='Quick search...']", "123", {
        replace: true,
    });
    await contains(".o-mail-DiscussSidebarChannel span", { count: 0 });

    // search should work in case-insensitive
    await insertText(".o-mail-DiscussSidebar input[placeholder='Quick search...']", "C", {
        replace: true,
    });
    await contains(".o-mail-DiscussSidebarChannel span", { count: 20 });
});

QUnit.test("sidebar: basic chat rendering", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Demo" });
    pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: pyEnv.currentPartnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel");
    await contains(".o-mail-DiscussSidebarChannel span", { text: "Demo" });
    await contains(".o-mail-DiscussSidebarChannel img[data-alt='Thread Image']");
    await contains(
        ".o-mail-DiscussSidebarChannel .o-mail-DiscussSidebarChannel-commands div[title='Unpin Conversation']"
    );
    await contains(".o-mail-DiscussSidebarChannel .badge", { count: 0 });
});

QUnit.test("sidebar: show pinned channel", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "General" });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel span", { text: "General" });
});

QUnit.test("sidebar: open pinned channel", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "General" });
    const { openDiscuss } = await start();
    openDiscuss();
    await click(".o-mail-DiscussSidebarChannel span", { text: "General" });
    await contains(".o-mail-Composer-input[placeholder='Message #General…']");
    await contains(".o-mail-Discuss-threadName", { value: "General" });
});

QUnit.test("sidebar: open channel and leave it", async (assert) => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "General",
        channel_member_ids: [
            Command.create({
                fold_state: "open",
                is_minimized: true,
                partner_id: pyEnv.currentPartnerId,
            }),
        ],
    });
    const { openDiscuss } = await start({
        async mockRPC(route, args) {
            if (args.method === "action_unfollow") {
                assert.step("action_unfollow");
                assert.deepEqual(args.args[0], channelId);
            }
        },
    });
    openDiscuss();
    await click(".o-mail-DiscussSidebarChannel span", { text: "General" });
    assert.verifySteps([]);

    await click(".o-mail-DiscussSidebarChannel:contains(General) .btn[title='Leave this channel']");
    assert.verifySteps(["action_unfollow"]);
    await contains(".o-mail-DiscussSidebarChannel span", { count: 0, text: "General" });

    await contains(".o-mail-Discuss-threadName", { count: 0, value: "General" });
});

QUnit.test("sidebar: unpin channel from bus", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel span", { text: "General" });

    await click(".o-mail-DiscussSidebarChannel span", { text: "General" });
    await contains(".o-mail-Composer-input[placeholder='Message #General…']");
    await contains(".o-mail-Discuss-threadName", { value: "General" });

    // Simulate receiving a leave channel notification
    // (e.g. from user interaction from another device or browser tab)
    pyEnv["bus.bus"]._sendone(pyEnv.currentPartner, "discuss.channel/unpin", { id: channelId });
    await contains(".o-mail-DiscussSidebarChannel span", { count: 0, text: "General" });

    await contains(".o-mail-Discuss-threadName", { count: 0, value: "General" });
});

QUnit.test("chat - channel should count unread message [REQUIRE FOCUS]", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({
        name: "Demo",
        im_status: "offline",
    });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ message_unread_counter: 1, partner_id: pyEnv.currentPartnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    pyEnv["mail.message"].create({
        author_id: partnerId,
        body: "<p>Test</p>",
        model: "discuss.channel",
        res_id: channelId,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(".o-discuss-badge", { text: "1" });
    await click(".o-mail-DiscussSidebarChannel span", { text: "Demo" });
    await contains(".o-discuss-badge", { count: 0 });
});

QUnit.test("mark channel as seen on last message visible [REQUIRE FOCUS]", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        channel_member_ids: [
            Command.create({ message_unread_counter: 1, partner_id: pyEnv.currentPartnerId }),
        ],
    });
    pyEnv["mail.message"].create({
        body: "not empty",
        model: "discuss.channel",
        res_id: channelId,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await click(".o-mail-DiscussSidebarChannel:contains(test).o-unread");
    await contains(".o-mail-DiscussSidebarChannel:contains(test):not(.o-unread)");
});

QUnit.test(
    "channel - counter: should not have a counter if the category is unfolded and without needaction messages",
    async () => {
        const pyEnv = await startServer();
        pyEnv["res.users.settings"].create({
            user_id: pyEnv.currentUserId,
            is_discuss_sidebar_category_channel_open: true,
        });
        pyEnv["discuss.channel"].create({ name: "general" });
        const { openDiscuss } = await start();
        openDiscuss();
        await contains(".o-mail-DiscussSidebarCategory", { text: "Channels" });
        await contains(".o-mail-DiscussSidebarCategory:contains(Channels) .badge", { count: 0 });
    }
);

QUnit.test(
    "channel - counter: should not have a counter if the category is unfolded and with needaction messages",
    async () => {
        const pyEnv = await startServer();
        pyEnv["res.users.settings"].create({
            user_id: pyEnv.currentUserId,
            is_discuss_sidebar_category_channel_open: true,
        });
        const [channelId_1, channelId_2] = pyEnv["discuss.channel"].create([
            { name: "channel1" },
            { name: "channel2" },
        ]);
        const [messageId_1, messageId_2] = pyEnv["mail.message"].create([
            {
                body: "message 1",
                model: "discuss.channel",
                res_id: channelId_1,
            },
            {
                body: "message_2",
                model: "discuss.channel",
                res_id: channelId_2,
            },
        ]);
        pyEnv["mail.notification"].create([
            {
                mail_message_id: messageId_1,
                notification_type: "inbox",
                res_partner_id: pyEnv.currentPartnerId,
            },
            {
                mail_message_id: messageId_2,
                notification_type: "inbox",
                res_partner_id: pyEnv.currentPartnerId,
            },
        ]);
        const { openDiscuss } = await start();
        openDiscuss();
        await contains(".o-mail-DiscussSidebarCategory", { text: "Channels" });
        await contains(".o-mail-DiscussSidebarCategory:contains(Channels) .badge", { count: 0 });
    }
);

QUnit.test(
    "channel - counter: should not have a counter if category is folded and without needaction messages",
    async () => {
        const pyEnv = await startServer();
        pyEnv["discuss.channel"].create({});
        pyEnv["res.users.settings"].create({
            user_id: pyEnv.currentUserId,
            is_discuss_sidebar_category_channel_open: false,
        });
        const { openDiscuss } = await start();
        openDiscuss();
        await contains(".o-mail-DiscussSidebarCategory", { text: "Channels" });
        await contains(".o-mail-DiscussSidebarCategory:contains(Channels) .badge", { count: 0 });
    }
);

QUnit.test(
    "channel - counter: should have correct value of needaction threads if category is folded and with needaction messages",
    async () => {
        const pyEnv = await startServer();
        const [channelId_1, channelId_2] = pyEnv["discuss.channel"].create([
            { name: "Channel_1" },
            { name: "Channel_2" },
        ]);
        const [messageId_1, messageId_2] = pyEnv["mail.message"].create([
            {
                body: "message 1",
                model: "discuss.channel",
                res_id: channelId_1,
            },
            {
                body: "message_2",
                model: "discuss.channel",
                res_id: channelId_2,
            },
        ]);
        pyEnv["mail.notification"].create([
            {
                mail_message_id: messageId_1,
                notification_type: "inbox",
                res_partner_id: pyEnv.currentPartnerId,
            },
            {
                mail_message_id: messageId_2,
                notification_type: "inbox",
                res_partner_id: pyEnv.currentPartnerId,
            },
        ]);
        pyEnv["res.users.settings"].create({
            user_id: pyEnv.currentUserId,
            is_discuss_sidebar_category_channel_open: false,
        });
        const { openDiscuss } = await start();
        openDiscuss();
        await contains(".o-mail-DiscussSidebarCategory:contains(Channels) .badge", {
            text: "2",
        });
    }
);

QUnit.test(
    "chat - counter: should not have a counter if the category is unfolded and without unread messages",
    async () => {
        const pyEnv = await startServer();
        pyEnv["res.users.settings"].create({
            user_id: pyEnv.currentUserId,
            is_discuss_sidebar_category_chat_open: true,
        });
        pyEnv["discuss.channel"].create({
            channel_member_ids: [
                Command.create({ message_unread_counter: 0, partner_id: pyEnv.currentPartnerId }),
            ],
            channel_type: "chat",
        });
        const { openDiscuss } = await start();
        openDiscuss();
        await contains(".o-mail-DiscussSidebarCategory", { text: "Direct messages" });
        await contains(".o-mail-DiscussSidebarCategory:contains(Direct messages) .badge", {
            count: 0,
        });
    }
);

QUnit.test(
    "chat - counter: should not have a counter if the category is unfolded and with unread messagens",
    async () => {
        const pyEnv = await startServer();
        pyEnv["res.users.settings"].create({
            user_id: pyEnv.currentUserId,
            is_discuss_sidebar_category_chat_open: true,
        });
        pyEnv["discuss.channel"].create({
            channel_member_ids: [
                Command.create({
                    message_unread_counter: 10,
                    partner_id: pyEnv.currentPartnerId,
                }),
            ],
            channel_type: "chat",
        });
        const { openDiscuss } = await start();
        openDiscuss();
        await contains(".o-mail-DiscussSidebarCategory", { text: "Direct messages" });
        await contains(".o-mail-DiscussSidebarCategory:contains(Direct messages) .badge", {
            count: 0,
        });
    }
);

QUnit.test(
    "chat - counter: should not have a counter if category is folded and without unread messages",
    async () => {
        const pyEnv = await startServer();
        pyEnv["res.users.settings"].create({
            user_id: pyEnv.currentUserId,
            is_discuss_sidebar_category_chat_open: false,
        });
        pyEnv["discuss.channel"].create({
            channel_member_ids: [
                Command.create({ message_unread_counter: 0, partner_id: pyEnv.currentPartnerId }),
            ],
            channel_type: "chat",
        });
        const { openDiscuss } = await start();
        openDiscuss();
        await contains(".o-mail-DiscussSidebarCategory", { text: "Direct messages" });
        await contains(".o-mail-DiscussSidebarCategory:contains(Direct messages) .badge", {
            count: 0,
        });
    }
);

QUnit.test(
    "chat - counter: should have correct value of unread threads if category is folded and with unread messages",
    async () => {
        const pyEnv = await startServer();
        pyEnv["res.users.settings"].create({
            user_id: pyEnv.currentUserId,
            is_discuss_sidebar_category_chat_open: false,
        });
        pyEnv["discuss.channel"].create([
            {
                channel_member_ids: [
                    Command.create({
                        message_unread_counter: 10,
                        partner_id: pyEnv.currentPartnerId,
                    }),
                ],
                channel_type: "chat",
            },
            {
                channel_member_ids: [
                    Command.create({
                        message_unread_counter: 20,
                        partner_id: pyEnv.currentPartnerId,
                    }),
                ],
                channel_type: "chat",
            },
        ]);
        const { openDiscuss } = await start();
        openDiscuss();
        await contains(
            ".o-mail-DiscussSidebarCategory:contains(Direct messages) .badge:contains(2)"
        );
    }
);

QUnit.test("chat - command: should have add command when category is unfolded", async () => {
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(
        ".o-mail-DiscussSidebarCategory:contains(Direct messages) i[title='Start a conversation']"
    );
});

QUnit.test("chat - command: should not have add command when category is folded", async () => {
    const pyEnv = await startServer();
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: false,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(".o-mail-DiscussSidebarCategory", { text: "Direct messages" });
    await contains(
        ".o-mail-DiscussSidebarCategory:contains(Direct messages) i[title='Start a conversation']",
        { count: 0 }
    );
});

QUnit.test("chat - states: close manually by clicking the title", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ channel_type: "chat" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: true,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel");
    await click(".o-mail-DiscussSidebarCategory:contains(Direct messages) div:eq(0)");
    await contains(".o-mail-DiscussSidebarChannel", { count: 0 });
});

QUnit.test("sidebar channels should be ordered case insensitive alphabetically", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create([
        { name: "Xyz" },
        { name: "abc" },
        { name: "Abc" },
        { name: "Xyz" },
    ]);
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(
        ".o-mail-DiscussSidebarChannel:contains(abc) ~ .o-mail-DiscussSidebarChannel:contains(Abc) ~ .o-mail-DiscussSidebarChannel:contains(Xyz) ~ .o-mail-DiscussSidebarChannel:contains(Xyz)"
    );
});

QUnit.test("sidebar: public channel rendering", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({
        name: "channel1",
        channel_type: "channel",
        group_public_id: false,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains("button", { text: "channel1" });
    await contains("button:contains(channel1) .fa-globe");
});

QUnit.test("channel - avatar: should have correct avatar", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({
        name: "test",
        avatarCacheKey: "100111",
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel img");
    await contains(
        `img[data-src='${getOrigin()}/discuss/channel/${channelId}/avatar_128?unique=100111']`
    );
});

QUnit.test("channel - avatar: should update avatar url from bus", async (assert) => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ avatarCacheKey: "101010", name: "test" });
    const { env, openDiscuss } = await start();
    openDiscuss(channelId);
    await contains(
        `img[data-src='${getOrigin()}/discuss/channel/${channelId}/avatar_128?unique=101010']`,
        { count: 2 }
    );
    await env.services.orm.call("discuss.channel", "write", [
        [channelId],
        { image_128: "This field does not matter" },
    ]);
    const result = pyEnv["discuss.channel"].searchRead([["id", "=", channelId]]);
    const newCacheKey = result[0]["avatarCacheKey"];
    await contains(
        `img[data-src='${getOrigin()}/discuss/channel/${channelId}/avatar_128?unique=${newCacheKey}']`,
        { count: 2 }
    );
});

QUnit.test("channel - states: close should update the value on the server", async (assert) => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "test" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: true,
    });
    const currentUserId = pyEnv.currentUserId;
    const { openDiscuss, env } = await start();
    openDiscuss();
    const initalSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.ok(initalSettings.is_discuss_sidebar_category_channel_open);
    await click(".o-mail-DiscussSidebarCategory span", { text: "Channels" });
    const newSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.notOk(newSettings.is_discuss_sidebar_category_channel_open);
});

QUnit.test("channel - states: open should update the value on the server", async (assert) => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "test" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    const currentUserId = pyEnv.currentUserId;
    const { openDiscuss, env } = await start();
    openDiscuss();
    const initalSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.notOk(initalSettings.is_discuss_sidebar_category_channel_open);

    await click(".o-mail-DiscussSidebarCategory span", { text: "Channels" });
    const newSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.ok(newSettings.is_discuss_sidebar_category_channel_open);
});

QUnit.test("channel - states: close from the bus", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "channel1" });
    const userSettingsId = pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: true,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    pyEnv["bus.bus"]._sendone(pyEnv.currentPartner, "mail.record/insert", {
        "res.users.settings": {
            id: userSettingsId,
            is_discuss_sidebar_category_channel_open: false,
        },
    });
    await contains(".o-mail-DiscussSidebarCategory-channel .oi-chevron-right");
    await contains("button", { count: 0, text: "channel1" });
});

QUnit.test("channel - states: open from the bus", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "channel1" });
    const userSettingsId = pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_channel_open: false,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    pyEnv["bus.bus"]._sendone(pyEnv.currentPartner, "mail.record/insert", {
        "res.users.settings": {
            id: userSettingsId,
            is_discuss_sidebar_category_channel_open: true,
        },
    });
    await contains(".o-mail-DiscussSidebarCategory-channel .oi-chevron-down");
    await contains("button", { text: "channel1" });
});

QUnit.test(
    "channel - states: the active category item should be visible even if the category is closed",
    async () => {
        const pyEnv = await startServer();
        pyEnv["discuss.channel"].create({ name: "channel1" });
        const { openDiscuss } = await start();
        openDiscuss();
        await click(".o-mail-DiscussSidebarChannel span", { text: "channel1" });
        await contains("button:contains(channel1).o-active");

        await click(".o-mail-DiscussSidebarCategory span", { text: "Channels" });
        await contains(".o-mail-DiscussSidebarCategory-channel .oi-chevron-right");
        await contains("button", { text: "channel1" });

        await click("button div", { text: "Inbox" });
        await contains("button", { count: 0, text: "channel1" });
    }
);

QUnit.test("chat - states: open manually by clicking the title", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({
        channel_type: "chat",
    });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: false,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    await click(".o-mail-DiscussSidebarCategory-chat span", { text: "Direct messages" });
    await contains(".o-mail-DiscussSidebar button", { text: "Mitchell Admin" });
});

QUnit.test("chat - states: close should call update server data", async (assert) => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "test" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: true,
    });
    const currentUserId = pyEnv.currentUserId;
    const { openDiscuss, env } = await start();
    openDiscuss();
    const initalSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.ok(initalSettings.is_discuss_sidebar_category_chat_open);

    await click(".o-mail-DiscussSidebarCategory-chat span", { text: "Direct messages" });
    const newSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.notOk(newSettings.is_discuss_sidebar_category_chat_open);
});

QUnit.test("chat - states: open should call update server data", async (assert) => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "test" });
    pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: false,
    });
    const { openDiscuss, env } = await start();
    openDiscuss();
    const currentUserId = pyEnv.currentUserId;
    const initalSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.notOk(initalSettings.is_discuss_sidebar_category_chat_open);

    await click(".o-mail-DiscussSidebarCategory-chat span", { text: "Direct messages" });
    const newSettings = await env.services.orm.call(
        "res.users.settings",
        "_find_or_create_for_user",
        [[currentUserId]]
    );
    assert.ok(newSettings.is_discuss_sidebar_category_chat_open);
});

QUnit.test("chat - states: close from the bus", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ channel_type: "chat" });
    const userSettingsId = pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: true,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    pyEnv["bus.bus"]._sendone(pyEnv.currentPartner, "mail.record/insert", {
        "res.users.settings": {
            id: userSettingsId,
            is_discuss_sidebar_category_chat_open: false,
        },
    });
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-right");
    await contains(".o-mail-DiscussSidebar button", { count: 0, text: "Mitchell Admin" });
});

QUnit.test("chat - states: open from the bus", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ channel_type: "chat" });
    const userSettingsId = pyEnv["res.users.settings"].create({
        user_id: pyEnv.currentUserId,
        is_discuss_sidebar_category_chat_open: false,
    });
    const { openDiscuss } = await start();
    openDiscuss();
    pyEnv["bus.bus"]._sendone(pyEnv.currentPartner, "mail.record/insert", {
        "res.users.settings": {
            id: userSettingsId,
            is_discuss_sidebar_category_chat_open: true,
        },
    });
    await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-down");
    await contains(".o-mail-DiscussSidebar button", { text: "Mitchell Admin" });
});

QUnit.test(
    "chat - states: the active category item should be visible even if the category is closed",
    async () => {
        const pyEnv = await startServer();
        pyEnv["discuss.channel"].create({ channel_type: "chat" });
        const { openDiscuss } = await start();
        openDiscuss();
        await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-down");
        await contains(".o-mail-DiscussSidebar button", { text: "Mitchell Admin" });

        await click(".o-mail-DiscussSidebar button", { text: "Mitchell Admin" });
        await contains("button:contains(Mitchell Admin).o-active");

        await click(".o-mail-DiscussSidebarCategory-chat span", { text: "Direct messages" });
        await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-right");
        await contains(".o-mail-DiscussSidebar button", { text: "Mitchell Admin" });

        await click("button div", { text: "Inbox" });
        await contains(".o-mail-DiscussSidebarCategory-chat .oi-chevron-right");
        await contains(".o-mail-DiscussSidebar button", { count: 0, text: "Mitchell Admin" });
    }
);

QUnit.test("chat - avatar: should have correct avatar", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({
        name: "Demo",
        im_status: "offline",
    });
    pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: pyEnv.currentPartnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "chat",
    });
    const { openDiscuss } = await start();
    openDiscuss();

    await contains(".o-mail-DiscussSidebarChannel img");
    await contains(`img[data-src='/web/image/res.partner/${partnerId}/avatar_128']`);
});

QUnit.test("chat should be sorted by last activity time [REQUIRE FOCUS]", async () => {
    const pyEnv = await startServer();
    const [demo_id, yoshi_id] = pyEnv["res.partner"].create([{ name: "Demo" }, { name: "Yoshi" }]);
    pyEnv["res.users"].create([{ partner_id: demo_id }, { partner_id: yoshi_id }]);
    pyEnv["discuss.channel"].create([
        {
            channel_member_ids: [
                [
                    0,
                    0,
                    {
                        last_interest_dt: "2021-01-01 10:00:00",
                        partner_id: pyEnv.currentPartnerId,
                    },
                ],
                Command.create({ partner_id: demo_id }),
            ],
            channel_type: "chat",
        },
        {
            channel_member_ids: [
                [
                    0,
                    0,
                    {
                        last_interest_dt: "2021-02-01 10:00:00",
                        partner_id: pyEnv.currentPartnerId,
                    },
                ],
                Command.create({ partner_id: yoshi_id }),
            ],
            channel_type: "chat",
        },
    ]);
    const { openDiscuss } = await start();
    openDiscuss();
    await click(
        ".o-mail-DiscussSidebarChannel:contains(Yoshi) ~ .o-mail-DiscussSidebarChannel:contains(Demo)"
    );
    // post a new message on the last channel
    await insertText(".o-mail-Composer-input", "Blabla");
    await click(".o-mail-Composer-send:not(:disabled)");
    await contains(
        ".o-mail-DiscussSidebarChannel:contains(Demo) ~ .o-mail-DiscussSidebarChannel:contains(Yoshi)"
    );
});

QUnit.test("Can unpin chat channel", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ channel_type: "chat" });
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel span", { text: "Mitchell Admin" });
    await click(".o-mail-DiscussSidebarChannel [title='Unpin Conversation']");
    await contains(".o-mail-DiscussSidebarChannel span", { count: 0, text: "Mitchell Admin" });
});

QUnit.test("Unpinning chat should display notification", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ channel_type: "chat" });
    const { openDiscuss } = await start();
    openDiscuss();
    await click(".o-mail-DiscussSidebarChannel [title='Unpin Conversation']");
    await contains(".o-mail-DiscussSidebarChannel span", { count: 0 });
    await contains(
        ".o_notification.border-info:contains(You unpinned your conversation with Mitchell Admin)"
    );
});

QUnit.test("Can leave channel", async () => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General" });
    const { openDiscuss } = await start();
    openDiscuss(channelId);
    await contains(".o-mail-DiscussSidebarChannel span", { text: "General" });
    await click("[title='Leave this channel']");
    await contains(".o-mail-DiscussSidebarChannel span", { count: 0, text: "General" });
});

QUnit.test("Do no channel_info after unpin", async (assert) => {
    const pyEnv = await startServer();
    const channelId = pyEnv["discuss.channel"].create({ name: "General", channel_type: "chat" });
    const { env, openDiscuss } = await start({
        mockRPC(route, args, originalRPC) {
            if (route === "/discuss/channel/info") {
                assert.step("channel_info");
            }
            return originalRPC(route, args);
        },
    });
    openDiscuss(channelId);
    await click(".o-mail-DiscussSidebarChannel-commands [title='Unpin Conversation']");
    env.services.rpc("/mail/message/post", {
        thread_id: channelId,
        thread_model: "discuss.channel",
        post_data: {
            body: "Hello world",
            message_type: "comment",
        },
    });
    // weak test, no guarantee that we waited long enough for the potential rpc to be done
    assert.verifySteps([]);
});

QUnit.test("Group unread counter up to date after mention is marked as seen", async () => {
    const pyEnv = await startServer();
    const partnerId = pyEnv["res.partner"].create({ name: "Chuck" });
    const channelId = pyEnv["discuss.channel"].create({
        channel_member_ids: [
            Command.create({ partner_id: pyEnv.currentPartnerId }),
            Command.create({ partner_id: partnerId }),
        ],
        channel_type: "group",
    });
    const messageId = pyEnv["mail.message"].create({
        author_id: partnerId,
        model: "discuss.channel",
        res_id: channelId,
        body: "@Mitchell Admin",
        needaction: true,
    });
    pyEnv["mail.notification"].create([
        {
            mail_message_id: messageId,
            notification_type: "inbox",
            res_partner_id: pyEnv.currentPartnerId,
        },
    ]);
    const { openDiscuss } = await start();
    openDiscuss();
    await contains(".o-mail-DiscussSidebarChannel .o-discuss-badge");
    click(".o-mail-DiscussSidebarChannel");
    await contains(".o-discuss-badge", { count: 0 });
});

QUnit.test("Unpinning channel closes its chat window", async () => {
    const pyEnv = await startServer();
    pyEnv["discuss.channel"].create({ name: "Sales" });
    const { openFormView, openDiscuss } = await start();
    await openFormView("discuss.channel");
    await click(".o_menu_systray i[aria-label='Messages']");
    await click(".o-mail-NotificationItem");
    await contains(".o-mail-ChatWindow-name", { text: "Sales" });
    openDiscuss();
    await click(".o-mail-DiscussSidebarChannel:contains(Sales) [title='Leave this channel']");
    await openFormView("discuss.channel");
    await contains(".o-mail-ChatWindow", { count: 0, text: "Sales" });
});
