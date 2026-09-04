"""Numeric oracle for finance/valuation/explore.html.

Prints the page's default readouts so the JS self-test can be checked
against an independent implementation. Also the Rosetta Stone source.
"""
import math
import numpy as np


def dcf(fcf1, g, n, r, g_t):
    """Discounted cash flow with a Gordon terminal value.

    fcf1: first-year cash; g: explicit growth; n: explicit years;
    r: discount rate; g_t: terminal growth (must be < r).
    """
    if g_t >= r:
        raise ValueError("terminal growth must be below the discount rate")
    pv_explicit = 0.0
    fcf = fcf1
    for t in range(1, n + 1):
        if t > 1:
            fcf *= 1 + g
        pv_explicit += fcf / (1 + r) ** t
    fcf_n = fcf1 * (1 + g) ** (n - 1)
    tv = fcf_n * (1 + g_t) / (r - g_t)
    pv_terminal = tv / (1 + r) ** n
    value = pv_explicit + pv_terminal
    return dict(value=value, pv_explicit=pv_explicit, pv_terminal=pv_terminal,
                tv=tv, terminal_share=pv_terminal / value)


def implied_growth(price, fcf1, n, r, g_t, lo=-0.20, hi=0.60, tol=1e-12):
    """Reverse DCF: the explicit growth rate at which dcf(...) == price.

    Value is monotone in g, so bisection is valid. Returns None when the
    price is outside [dcf(lo), dcf(hi)].
    """
    if price < dcf(fcf1, lo, n, r, g_t)["value"] or price > dcf(fcf1, hi, n, r, g_t)["value"]:
        return None
    for _ in range(200):
        mid = 0.5 * (lo + hi)
        if dcf(fcf1, mid, n, r, g_t)["value"] < price:
            lo = mid
        else:
            hi = mid
        if hi - lo < tol:
            break
    return 0.5 * (lo + hi)


def kelly(q, G, B):
    """Kelly fraction for a two-outcome multiplicative bet, clamped to [0, 1]."""
    a, b = G - 1.0, 1.0 - B
    return max(0.0, min(1.0, q / b - (1 - q) / a))


def time_avg_growth(f, q, G, B):
    """Per-period growth of log wealth when committing fraction f (no burn)."""
    return q * math.log(1 - f + f * G) + (1 - q) * math.log(1 - f + f * B)


def ensemble_growth(f, q, G, B):
    """Per-period growth of the ensemble-average wealth."""
    return math.log(1 - f + f * (q * G + (1 - q) * B))


def pareto_mean(xm, alpha):
    return math.inf if alpha <= 1 else xm * alpha / (alpha - 1)


def simulate_paths(f, q, G, B, c, T, eps, n_paths=200, seed=42):
    """Wealth paths W[t+1] = W[t]*(1 - f + f*M) - c, frozen at eps once ruined."""
    rng = np.random.default_rng(seed)
    W = np.ones((n_paths, T + 1))
    alive = np.ones(n_paths, dtype=bool)
    for t in range(T):
        M = np.where(rng.random(n_paths) < q, G, B)
        nxt = W[:, t] * (1 - f + f * M) - c
        ruined = nxt <= eps
        nxt = np.where(ruined, eps, nxt)
        alive &= ~ruined
        W[:, t + 1] = np.where(alive | ruined, nxt, eps)
    return W


def main():
    s1 = dcf(100, 0.08, 10, 0.10, 0.025)
    print("S1", {k: repr(v) for k, v in s1.items()})
    for r in (0.09, 0.10, 0.11):
        print("S1 grid r=%.2f" % r, ["%.4f" % dcf(100, 0.08, 10, r, gt)["value"] for gt in (0.02, 0.025, 0.03)])
    print("S2 implied_growth(V) =", repr(implied_growth(s1["value"], 100, 10, 0.10, 0.025)))
    print("S2 A =", repr(dcf(100 * 1.00, 0.08, 10, 0.09, 0.025)["value"]))
    print("S2 B =", repr(dcf(100 * 1.15, 0.10, 10, 0.11, 0.025)["value"]))
    print("S2 S =", repr(dcf(100, 0.08, 10, 0.12, 0.025)["value"]))
    print("S3 V_T =", repr(dcf(40, 0.05, 10, 0.10, 0.02)["value"]), "V_A =", repr(dcf(300, 0.04, 10, 0.10, 0.02)["value"]))
    print("S4 E[X] =", repr(pareto_mean(0.20, 1.5)), "E[R] =", repr(0.08 - 0.05 * pareto_mean(0.20, 1.5)))
    print("S5 kelly =", repr(kelly(0.5, 1.5, 0.6)), "g(0.25) =", repr(time_avg_growth(0.25, 0.5, 1.5, 0.6)),
          "g(1.0) =", repr(time_avg_growth(1.0, 0.5, 1.5, 0.6)), "g_ens(1.0) =", repr(ensemble_growth(1.0, 0.5, 1.5, 0.6)))
    print("S5 lottery kelly =", repr(kelly(0.05, 20, 0.7)))
    W = simulate_paths(1.0, 0.5, 1.5, 0.6, 0.0, 60, 0.05)
    print("S5 sim: median W_T = %.4f  mean W_T = %.4f  ruin = %.3f" % (
        np.median(W[:, -1]), W[:, -1].mean(), (W[:, -1] <= 0.05).mean()))


if __name__ == "__main__":
    main()
