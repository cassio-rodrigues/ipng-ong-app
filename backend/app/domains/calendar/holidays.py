"""Feriados nacionais brasileiros (e do estado de SP) calculados para um ano.

Pontos facultativos de Carnaval e Corpus Christi entram porque, na prática, não há aula.
"""
from __future__ import annotations

from datetime import date, timedelta


def easter(year: int) -> date:
    """Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano)."""
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month, day = divmod(h + l - 7 * m + 114, 31)
    return date(year, month, day + 1)


def br_holidays(year: int, include_sp: bool = False) -> list[tuple[date, str]]:
    p = easter(year)
    days = [
        (date(year, 1, 1), "Confraternização Universal"),
        (p - timedelta(days=48), "Carnaval (ponto facultativo)"),
        (p - timedelta(days=47), "Carnaval (ponto facultativo)"),
        (p - timedelta(days=2), "Sexta-feira Santa"),
        (date(year, 4, 21), "Tiradentes"),
        (date(year, 5, 1), "Dia do Trabalho"),
        (p + timedelta(days=60), "Corpus Christi (ponto facultativo)"),
        (date(year, 9, 7), "Independência do Brasil"),
        (date(year, 10, 12), "Nossa Senhora Aparecida"),
        (date(year, 11, 2), "Finados"),
        (date(year, 11, 15), "Proclamação da República"),
        (date(year, 12, 25), "Natal"),
    ]
    # Feriado nacional desde a Lei 14.759/2023
    if year >= 2024:
        days.append((date(year, 11, 20), "Dia Nacional de Zumbi e da Consciência Negra"))
    if include_sp:
        days.append((date(year, 7, 9), "Revolução Constitucionalista (SP)"))
    return sorted(days)
