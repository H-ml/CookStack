"use client";

import { useDeferredValue, useState } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  ClipboardList,
  PackagePlus,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ShoppingPanel } from "@/components/shopping-panel";
import { useKitchen } from "@/components/kitchen-store";
import type { IngredientDraft, InventoryFilter, InventoryItem } from "@/components/kitchen-types";
import {
  formatDateLabel,
  formatQuantity,
  getExpiryLabel,
  getItemUrgency,
  parseInventoryCommand,
  sortInventory,
} from "@/components/kitchen-utils";

const inventoryFilters: InventoryFilter[] = ["全部", "临近过期", "蔬菜", "肉类", "调料", "干货", "其他"];

type AiResponseMode = "idle" | "draft" | "expiry";

interface InventoryTabProps {
  onOpenRecipeManager: () => void;
}

export function InventoryTab({ onOpenRecipeManager }: InventoryTabProps) {
  const {
    state,
    addInventoryItems,
    consumeInventoryItem,
    deleteInventoryItem,
    dismissExpiring,
    updateInventoryItem,
  } = useKitchen();

  const [command, setCommand] = useState("");
  const [aiResponseMode, setAiResponseMode] = useState<AiResponseMode>("idle");
  const [pendingItems, setPendingItems] = useState<IngredientDraft[]>([]);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [shoppingDrawerOpen, setShoppingDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<InventoryFilter>("全部");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "edit">("view");
  const [customConsume, setCustomConsume] = useState("");

  const deferredSearch = useDeferredValue(search);
  const sortedInventory = sortInventory(state.inventory);
  const expiringItems = sortedInventory.filter(
    (item) => item.status === "in-stock" && getItemUrgency(item) !== "normal",
  );
  const visibleExpiringItems = expiringItems.filter(
    (item) => !state.dismissedExpiringIds.includes(item.id),
  );

  const visibleInventory = sortedInventory.filter((item) => {
    if (item.status !== "in-stock") {
      return false;
    }

    if (activeFilter === "临近过期" && getItemUrgency(item) === "normal") {
      return false;
    }

    if (activeFilter !== "全部" && activeFilter !== "临近过期" && item.category !== activeFilter) {
      return false;
    }

    if (!deferredSearch.trim()) {
      return true;
    }

    return item.name.toLowerCase().includes(deferredSearch.trim().toLowerCase());
  });

  function resetAiCard() {
    setAiResponseMode("idle");
    setPendingItems([]);
    setIsEditingDraft(false);
  }

  function handleCommandSubmit() {
    const result = parseInventoryCommand(command);

    if (result.type === "expiry-query") {
      setAiResponseMode("expiry");
      setPendingItems([]);
      setIsEditingDraft(false);
      return;
    }

    if (result.type === "unknown") {
      toast.error("没有识别到食材，试试“买了 3 个番茄和一斤排骨”");
      return;
    }

    setPendingItems(result.items);
    setAiResponseMode("draft");
    setIsEditingDraft(false);
  }

  function handleConfirmInventory() {
    const validItems = pendingItems.filter((item) => item.name.trim() && item.quantity > 0);

    if (validItems.length === 0) {
      toast.error("至少需要一条有效食材记录");
      return;
    }

    addInventoryItems(validItems);
    toast.success(`已入库 ${validItems.length} 项食材`);
    setCommand("");
    resetAiCard();
  }

  return (
    <div className="screen-stack">
      <section className="hero-panel">
        <div className="hero-panel__copy">
          <p className="section-kicker">Inventory Studio</p>
          <h1>库存还是主控台，食谱和计划围着它转。</h1>
          <p>一句话入库、查快过期、随时打开食谱管理和采购清单，形成真正能用的日常工作流。</p>
          <div className="hero-metrics">
            <article className="metric-card">
              <span>在库食材</span>
              <strong>{state.inventory.filter((item) => item.status === "in-stock").length}</strong>
            </article>
            <article className="metric-card">
              <span>快过期</span>
              <strong>{expiringItems.length}</strong>
            </article>
            <article className="metric-card">
              <span>待采购</span>
              <strong>{state.shoppingList.length}</strong>
            </article>
          </div>
        </div>
        <div className="hero-panel__surface">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Command Center</p>
              <h2>一句话录入库存</h2>
            </div>
            <Sparkles size={18} />
          </div>
          <div className="command-box">
            <textarea
              className="field field--textarea"
              onChange={(event) => setCommand(event.target.value)}
              placeholder="比如：买了 3 个番茄、半斤牛肉和两个土豆"
              value={command}
            />
            <div className="command-box__actions">
              <button className="button button--secondary" onClick={onOpenRecipeManager} type="button">
                <Sparkles size={16} />
                粘贴食谱
              </button>
              <button className="button button--primary" onClick={handleCommandSubmit} type="button">
                <PackagePlus size={16} />
                解析入库
              </button>
            </div>
          </div>
          <div className="example-tags">
            <button className="tag-pill" onClick={() => setCommand("买了3个番茄和一斤排骨")} type="button">
              买了 3 个番茄和一斤排骨
            </button>
            <button className="tag-pill" onClick={() => setCommand("冰箱里还有什么快坏了")} type="button">
              冰箱里还有什么快坏了
            </button>
          </div>
        </div>
      </section>

      {visibleExpiringItems.length > 0 ? (
        <section className="banner banner--warning">
          <div className="banner__copy">
            <AlertTriangle size={18} />
            <div>
              <h3>冰箱里有 {visibleExpiringItems.length} 样食材需要优先处理</h3>
              <p>最紧急的是 {visibleExpiringItems[0]?.name}，建议今天就安排进菜单。</p>
            </div>
          </div>
          <div className="banner__actions">
            <button className="button button--ghost" onClick={() => setActiveFilter("临近过期")} type="button">
              只看临期
            </button>
            <button
              className="button button--ghost"
              onClick={() => dismissExpiring(visibleExpiringItems.map((item) => item.id))}
              type="button"
            >
              稍后提醒
            </button>
          </div>
        </section>
      ) : null}

      {aiResponseMode === "draft" ? (
        <section className="glass-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">AI Result</p>
              <h2>检测到以下食材</h2>
            </div>
            <button className="icon-button" onClick={resetAiCard} type="button">
              <X size={16} />
            </button>
          </div>

          {!isEditingDraft ? (
            <>
              <div className="draft-list">
                {pendingItems.map((item) => (
                  <article className="draft-row" key={item.id}>
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        {formatQuantity(item.quantity)}
                        {item.unit} · {item.category}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="inline-actions">
                <button className="button button--primary" onClick={handleConfirmInventory} type="button">
                  确认入库
                </button>
                <button className="button button--secondary" onClick={() => setIsEditingDraft(true)} type="button">
                  编辑
                </button>
                <button className="button button--ghost" onClick={resetAiCard} type="button">
                  取消
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="draft-editor">
                {pendingItems.map((item, index) => (
                  <div className="draft-editor__row" key={item.id}>
                    <input
                      className="field"
                      onChange={(event) =>
                        setPendingItems((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, name: event.target.value } : entry,
                          ),
                        )
                      }
                      placeholder="名称"
                      value={item.name}
                    />
                    <input
                      className="field"
                      inputMode="decimal"
                      onChange={(event) =>
                        setPendingItems((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? {
                                  ...entry,
                                  quantity: Number.parseFloat(event.target.value || "0"),
                                }
                              : entry,
                          ),
                        )
                      }
                      placeholder="数量"
                      value={item.quantity || ""}
                    />
                    <select
                      className="field"
                      onChange={(event) =>
                        setPendingItems((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, unit: event.target.value as IngredientDraft["unit"] }
                              : entry,
                          ),
                        )
                      }
                      value={item.unit}
                    >
                      {["个", "斤", "克", "公斤", "两", "升", "毫升", "根"].map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                    <select
                      className="field"
                      onChange={(event) =>
                        setPendingItems((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, category: event.target.value as IngredientDraft["category"] }
                              : entry,
                          ),
                        )
                      }
                      value={item.category}
                    >
                      {["蔬菜", "肉类", "调料", "干货", "其他"].map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <button
                      className="icon-button"
                      onClick={() => setPendingItems((current) => current.filter((entry) => entry.id !== item.id))}
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="inline-actions">
                <button
                  className="button button--ghost"
                  onClick={() =>
                    setPendingItems((current) => [
                      ...current,
                      {
                        id: `draft-new-${Date.now()}`,
                        name: "",
                        quantity: 1,
                        unit: "个",
                        category: "其他",
                      },
                    ])
                  }
                  type="button"
                >
                  + 添加食材
                </button>
                <button className="button button--primary" onClick={handleConfirmInventory} type="button">
                  保存并入库
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {aiResponseMode === "expiry" ? (
        <section className="glass-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Smart Alert</p>
              <h2>以下食材将在 3 天内过期</h2>
            </div>
            <button className="icon-button" onClick={resetAiCard} type="button">
              <X size={16} />
            </button>
          </div>
          <div className="draft-list">
            {expiringItems.length > 0 ? (
              expiringItems.map((item) => (
                <article className="draft-row" key={item.id}>
                  <div>
                    <h3>{item.name}</h3>
                    <p>
                      {formatQuantity(item.quantity)}
                      {item.unit} · {getExpiryLabel(item.expiryDate)}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-card">
                <Sparkles size={24} />
                <div>
                  <h3>当前没有紧急预警</h3>
                  <p>你的库存状态很健康，可以放心安排这周的菜单。</p>
                </div>
              </div>
            )}
          </div>
          <div className="inline-actions">
            <button className="button button--primary" onClick={() => setActiveFilter("临近过期")} type="button">
              去处理
            </button>
            <button className="button button--ghost" onClick={resetAiCard} type="button">
              忽略
            </button>
          </div>
        </section>
      ) : null}

      <section className="inventory-toolbar">
        <div className="inventory-toolbar__search">
          <Search size={18} />
          <input
            className="field field--search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索食材名称"
            value={search}
          />
        </div>
        <div className="filter-pills">
          {inventoryFilters.map((filter) => (
            <button
              className={clsx("tag-pill", activeFilter === filter && "tag-pill--active")}
              key={filter}
              onClick={() => setActiveFilter(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="inventory-grid">
        {visibleInventory.length === 0 ? (
          <article className="empty-card empty-card--large">
            <ClipboardList size={28} />
            <div>
              <h3>冰箱还是空的</h3>
              <p>试试在上面的输入框写“买了 xxx”，我们就能帮你把库存搭起来。</p>
            </div>
          </article>
        ) : (
          visibleInventory.map((item) => (
            <button
              className={clsx("inventory-card", `inventory-card--${getItemUrgency(item)}`)}
              key={item.id}
              onClick={() => {
                setSelectedItem(item);
                setDetailMode("view");
                setCustomConsume("");
              }}
              type="button"
            >
              <div className="inventory-card__head">
                <span className="pill">{item.category}</span>
                <span className="inventory-card__expiry">{getExpiryLabel(item.expiryDate)}</span>
              </div>
              <h3>{item.name}</h3>
              <p className="inventory-card__quantity">
                {formatQuantity(item.quantity)}
                {item.unit}
              </p>
              <p className="inventory-card__date">保质期至 {formatDateLabel(item.expiryDate)}</p>
            </button>
          ))
        )}
      </section>

      <button className="floating-cart" onClick={() => setShoppingDrawerOpen((current) => !current)} type="button">
        <ShoppingCart size={18} />
        <span>采购清单</span>
        <strong>{state.shoppingList.length}</strong>
      </button>

      {shoppingDrawerOpen ? (
        <div className="drawer">
          <div className="drawer__backdrop" onClick={() => setShoppingDrawerOpen(false)} />
          <aside className="drawer__panel">
            <ShoppingPanel compact onClose={() => setShoppingDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      {selectedItem ? (
        <div className="modal">
          <div className="modal__backdrop" onClick={() => setSelectedItem(null)} />
          <div className="modal__panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">Inventory Detail</p>
                <h2>{selectedItem.name}</h2>
              </div>
              <button className="icon-button" onClick={() => setSelectedItem(null)} type="button">
                <X size={16} />
              </button>
            </div>

            {detailMode === "view" ? (
              <>
                <div className="detail-grid">
                  <article className="detail-card">
                    <span>分类</span>
                    <strong>{selectedItem.category}</strong>
                  </article>
                  <article className="detail-card">
                    <span>剩余</span>
                    <strong>
                      {formatQuantity(selectedItem.quantity)}
                      {selectedItem.unit}
                    </strong>
                  </article>
                  <article className="detail-card">
                    <span>保质期</span>
                    <strong>{formatDateLabel(selectedItem.expiryDate)}</strong>
                  </article>
                  <article className="detail-card">
                    <span>状态</span>
                    <strong>{getExpiryLabel(selectedItem.expiryDate)}</strong>
                  </article>
                </div>
                <div className="inline-actions">
                  <button className="button button--secondary" onClick={() => setDetailMode("edit")} type="button">
                    编辑
                  </button>
                  <button
                    className="button button--ghost"
                    onClick={() => {
                      consumeInventoryItem(selectedItem.id, "half");
                      setSelectedItem({ ...selectedItem, quantity: selectedItem.quantity / 2 });
                      toast.success("已将库存减半");
                    }}
                    type="button"
                  >
                    用掉一半
                  </button>
                  <button
                    className="button button--danger"
                    onClick={() => {
                      consumeInventoryItem(selectedItem.id, "all");
                      toast.success("已标记为吃完");
                      setSelectedItem(null);
                    }}
                    type="button"
                  >
                    确认已吃完
                  </button>
                </div>
                <div className="custom-consume">
                  <input
                    className="field"
                    inputMode="decimal"
                    onChange={(event) => setCustomConsume(event.target.value)}
                    placeholder="自定义消耗量"
                    value={customConsume}
                  />
                  <button
                    className="button button--secondary"
                    onClick={() => {
                      const amount = Number.parseFloat(customConsume);
                      if (!amount || amount <= 0) {
                        toast.error("请输入有效的消耗量");
                        return;
                      }

                      consumeInventoryItem(selectedItem.id, "custom", amount);
                      toast.success("已扣减库存");
                      setSelectedItem(null);
                    }}
                    type="button"
                  >
                    扣减
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="draft-editor">
                  <div className="draft-editor__row">
                    <input
                      className="field"
                      onChange={(event) => setSelectedItem({ ...selectedItem, name: event.target.value })}
                      value={selectedItem.name}
                    />
                    <input
                      className="field"
                      inputMode="decimal"
                      onChange={(event) =>
                        setSelectedItem({
                          ...selectedItem,
                          quantity: Number.parseFloat(event.target.value || "0"),
                        })
                      }
                      value={selectedItem.quantity}
                    />
                    <select
                      className="field"
                      onChange={(event) =>
                        setSelectedItem({ ...selectedItem, unit: event.target.value as InventoryItem["unit"] })
                      }
                      value={selectedItem.unit}
                    >
                      {["个", "斤", "克", "公斤", "两", "升", "毫升", "根"].map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                    <select
                      className="field"
                      onChange={(event) =>
                        setSelectedItem({
                          ...selectedItem,
                          category: event.target.value as InventoryItem["category"],
                        })
                      }
                      value={selectedItem.category}
                    >
                      {["蔬菜", "肉类", "调料", "干货", "其他"].map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="draft-editor__row">
                    <input
                      className="field"
                      onChange={(event) => setSelectedItem({ ...selectedItem, expiryDate: event.target.value })}
                      type="date"
                      value={selectedItem.expiryDate}
                    />
                  </div>
                </div>
                <div className="inline-actions">
                  <button className="button button--ghost" onClick={() => setDetailMode("view")} type="button">
                    取消
                  </button>
                  <button
                    className="button button--primary"
                    onClick={() => {
                      if (!selectedItem.name.trim() || selectedItem.quantity <= 0) {
                        toast.error("名称不能为空，数量必须大于 0");
                        return;
                      }

                      updateInventoryItem(selectedItem);
                      toast.success("食材信息已更新");
                      setSelectedItem(null);
                    }}
                    type="button"
                  >
                    保存
                  </button>
                  <button
                    className="button button--danger"
                    onClick={() => {
                      deleteInventoryItem(selectedItem.id);
                      toast.success("已删除该食材");
                      setSelectedItem(null);
                    }}
                    type="button"
                  >
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
