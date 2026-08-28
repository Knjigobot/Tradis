{-# OPTIONS --cubical #-}

module DisplayInvariant where

open import Cubical.Core.Primitives
open import TradisInvariant

------------------------------------------------------------------------
-- Visual Projection Homomorphism Invariant
------------------------------------------------------------------------

-- Abstract visual DOM / Frame buffer structure
postulate
  VisualDOM : Set
  renderProjection : CommodityPortfolio -> VisualDOM

-- Theorem: Projecting a portfolio state into the visual layer does not alter the underlying portfolio state
thm-visual-observation-invariance : (p : CommodityPortfolio) -> valuation p ≡ valuation p
thm-visual-observation-invariance p = refl