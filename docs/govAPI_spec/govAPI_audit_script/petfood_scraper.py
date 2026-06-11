# -*- coding: utf-8 -*-
"""
農業部寵物食品申報網「查核及檢驗專區」抓取腳本
https://petfood.moa.gov.tw/Web/Audit

抓取三個資料來源(2026-06 實測可用):
  1. 檢驗不合格產品結果  FailedInspectionHandler.ashx
  2. 檢驗結果            InspectionHandler.ashx   (約 4,800+ 筆)
  3. 查核結果            ExamineHandler.ashx      (清單 + 逐項查核明細)

用法:
  pip install requests pandas openpyxl
  python petfood_scraper.py                 # 全部輸出到目前資料夾
  python petfood_scraper.py --out data      # 指定輸出資料夾
  python petfood_scraper.py --no-images     # 不另存不合格產品縮圖

輸出:
  petfood_failed.csv          檢驗不合格產品
  petfood_inspection.csv      檢驗結果
  petfood_examine_list.csv    查核結果(產品清單)
  petfood_examine_detail.csv  查核結果(逐項明細,可用 Year+Month+ESort 對回清單)
  petfood_audit.xlsx          以上四表合一
  thumbnails/                 不合格產品縮圖
"""
import argparse
import base64
import json
import os
import time
from datetime import date

import pandas as pd
import requests

BASE = "https://petfood.moa.gov.tw/Handler/Web"

# ★ 關鍵 header:這兩個缺一不可,少了伺服器會回「傳輸的資料為空」
HEADERS = {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "Mozilla/5.0 (data-sync script)",
    "Referer": "https://petfood.moa.gov.tw/Web/Audit",
}

TODAY = date.today()
DELAY = 0.5      # 每個請求間隔秒數,放過人家伺服器
PAGE_SIZE = 100


def post(endpoint: str, method: str, param: dict):
    """送出請求;回應的 Message 是 JSON 字串,需二次解析。"""
    r = requests.post(
        f"{BASE}/{endpoint}",
        headers=HEADERS,
        data=json.dumps({"Method": method, "Param": param}),
        timeout=30,
    )
    r.raise_for_status()
    res = r.json()
    if not res.get("Success"):
        raise RuntimeError(f"{endpoint} 回傳失敗: {res.get('Message')}")
    return json.loads(res["Message"]) if res["Message"] else []


# ──────────────────────────── 1. 檢驗不合格 ────────────────────────────
def fetch_failed():
    """日期區間查詢;回傳為陣列,翻頁直到單頁筆數 < pageSize。
    注意:RowCount 欄位不可靠(會回 pageSize),以實際筆數判斷結束。"""
    print("▶ 檢驗不合格產品結果")
    rows, page = [], 1
    while True:
        batch = post("FailedInspectionHandler.ashx", "FailedInspectionData", {
            "action": "getFailedInspectionFood",
            "currentPage": page, "pageSize": PAGE_SIZE,
            "orderByColumn": "PostDate", "sortDirection": "desc",
            "PostSDate": "2015/01/01",
            "PostEDate": TODAY.strftime("%Y/%m/%d"),
            "K_Delete": "0", "County": "", "KeyWord": "",
        })
        rows.extend(batch)
        print(f"  page {page}: +{len(batch)} (累計 {len(rows)})")
        if len(batch) < PAGE_SIZE:
            return rows
        page += 1
        time.sleep(DELAY)


# ───────────────────────────── 2. 檢驗結果 ─────────────────────────────
def fetch_inspection():
    """年月區間查詢;總筆數在每筆資料的 TotalCount 欄位。"""
    print("▶ 檢驗結果")
    rows, page, total = [], 1, None
    while True:
        batch = post("InspectionHandler.ashx", "InspectionData", {
            "action": "getInspectionData",
            "Year": 2015, "Month": 1,
            "EYear": TODAY.year, "EMonth": TODAY.month,
            "County": "", "KeyWord": "",
            "currentPage": page, "pageSize": PAGE_SIZE,
            "orderByColumn": "SortDate", "sortDirection": "ASC",
            "dataType": 0,
        })
        if not batch:
            return rows
        total = total or int(batch[0].get("TotalCount") or 0)
        rows.extend(batch)
        print(f"  page {page}: +{len(batch)} (累計 {len(rows)}/{total})")
        if len(rows) >= total or len(batch) < PAGE_SIZE:
            return rows
        page += 1
        time.sleep(DELAY)


# ───────────────────────────── 3. 查核結果 ─────────────────────────────
def fetch_examine():
    """年月區間查詢;回傳是物件:
       _ExamList(產品清單,內含 TotalCount)
       _ExamResultList(逐項查核明細,以 Year+Month+ESort 關聯)
       _ExamStatus(各月份是否公開)"""
    print("▶ 查核結果")
    lst, detail, page, total = [], [], 1, None
    while True:
        m = post("ExamineHandler.ashx", "ExamineData", {
            "action": "getExamineData",
            "Year": 2015, "Month": 1,
            "EYear": TODAY.year, "EMonth": TODAY.month,
            "CountyName": "", "KeyWord": "",
            "currentPage": page, "pageSize": PAGE_SIZE,
            "dataType": 0,
        })
        batch = m.get("_ExamList", [])
        if not batch:
            return lst, detail
        total = total or int(batch[0].get("TotalCount") or 0)
        lst.extend(batch)
        detail.extend(m.get("_ExamResultList", []))
        print(f"  page {page}: +{len(batch)} (累計 {len(lst)}/{total},明細 {len(detail)})")
        if len(lst) >= total or len(batch) < PAGE_SIZE:
            return lst, detail
        page += 1
        time.sleep(DELAY)


# ─────────────────────────────── 工具 ───────────────────────────────
def strip_images(rows, save_dir=None):
    """移除 base64 縮圖(體積極大),可選擇另存成圖檔。"""
    for row in rows:
        b64 = row.pop("FileBase64string", None)
        if b64 and save_dir:
            os.makedirs(save_dir, exist_ok=True)
            name = f"{row.get('FileID', 'img')}.{row.get('FileExt', 'jpg')}"
            with open(os.path.join(save_dir, name), "wb") as f:
                f.write(base64.b64decode(b64))
            row["ThumbnailFile"] = name
    return rows


def clean(rows):
    """共通清理:1900/01/01 代表「無」。"""
    for row in rows:
        for k, v in row.items():
            if v == "1900/01/01":
                row[k] = None
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-images", action="store_true", help="不另存縮圖")
    ap.add_argument("--out", default=".", help="輸出資料夾")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    failed = clean(strip_images(
        fetch_failed(),
        None if args.no_images else os.path.join(args.out, "thumbnails")))
    time.sleep(DELAY)
    inspection = clean(fetch_inspection())
    time.sleep(DELAY)
    exam_list, exam_detail = fetch_examine()
    clean(exam_list)

    tables = {
        "failed": pd.DataFrame(failed),
        "inspection": pd.DataFrame(inspection),
        "examine_list": pd.DataFrame(exam_list),
        "examine_detail": pd.DataFrame(exam_detail),
    }
    for name, df in tables.items():
        path = os.path.join(args.out, f"petfood_{name}.csv")
        df.to_csv(path, index=False, encoding="utf-8-sig")  # BOM:Excel 中文不亂碼
        print(f"✔ {path}: {len(df)} 筆")

    xlsx = os.path.join(args.out, "petfood_audit.xlsx")
    sheet_names = {"failed": "檢驗不合格", "inspection": "檢驗結果",
                   "examine_list": "查核結果清單", "examine_detail": "查核結果明細"}
    with pd.ExcelWriter(xlsx, engine="openpyxl") as w:
        for name, df in tables.items():
            df.to_excel(w, sheet_name=sheet_names[name], index=False)
    print(f"✔ {xlsx}")


if __name__ == "__main__":
    main()
